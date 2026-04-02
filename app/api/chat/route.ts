import { streamText, stepCountIs } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { retrieve, buildContext, buildSystemPrompt, extractSources } from '@/lib/rag'
import { screenInput, scanOutput } from '@/lib/privacy'
import { CHAT_MODEL, NO_ANSWER_MARKER } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { metabaseSearchCards, metabaseRunCard, metabaseExploreSchema, metabaseRunSql } from '@/lib/metabase'
import { nektQuery } from '@/lib/nekt'
import type { UIMessage } from 'ai'

const _openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
})
// Use .chat() explicitly — OpenRouter only supports /v1/chat/completions, not the Responses API
const openrouterModel = _openrouter.chat(CHAT_MODEL)

export async function POST(request: Request) {
  const body = await request.json()

  // Suporta dois formatos: { message } (curl/direto) e { messages } (DefaultChatTransport)
  let message: string = body.message ?? ''
  if (!message && Array.isArray(body.messages)) {
    const lastUser = [...body.messages].reverse().find((m: UIMessage) => m.role === 'user')
    const textPart = lastUser?.parts?.find((p: { type: string }) => p.type === 'text') as { type: 'text'; text: string } | undefined
    message = textPart?.text ?? ''
  }

  const conversation_id: string | undefined = body.conversation_id
  const filters: { bu?: string; section?: string } | undefined = body.filters

  // Camada 1: input screening
  const inputCheck = screenInput(message)
  if (inputCheck.blocked) {
    return Response.json({ error: inputCheck.reason, blocked: true })
  }

  // Recupera ou cria conversa
  let convId = conversation_id
  if (!convId) {
    const { data: conv } = await supabase
      .from('oracle_conversations')
      .insert({ source: 'web' })
      .select('id')
      .single()
    convId = conv?.id
  }

  // RAG: recupera chunks relevantes com base na última pergunta
  const chunks = await retrieve(message, filters)
  const context = buildContext(chunks)
  const systemPrompt = buildSystemPrompt(context)
  const sources = extractSources(chunks)

  // Constrói histórico de conversa para o modelo ter memória dentro da sessão
  type CoreMsg = { role: 'user' | 'assistant'; content: string }
  let coreMessages: CoreMsg[]
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    coreMessages = (body.messages as UIMessage[])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => {
        const textPart = m.parts?.find((p: { type: string }) => p.type === 'text') as { type: 'text'; text: string } | undefined
        return { role: m.role as 'user' | 'assistant', content: textPart?.text ?? '' }
      })
      .filter((m) => m.content.length > 0)
  } else {
    coreMessages = [{ role: 'user', content: message }]
  }

  // Streaming com Claude Sonnet via OpenRouter + tools
  let result
  try {
    result = streamText({
    model: openrouterModel,
    system: systemPrompt,
    messages: coreMessages,
    tools: {
      metabase_search_cards: metabaseSearchCards,
      metabase_run_card: metabaseRunCard,
      metabase_explore_schema: metabaseExploreSchema,
      metabase_run_sql: metabaseRunSql,
      nekt_query: nektQuery,
    },
    toolChoice: 'auto',
    stopWhen: stepCountIs(20),
    onFinish: async ({ text, usage }) => {
      // Camada 2: output scanning
      const scanned = scanOutput(text)
      const finalContent = scanned !== text ? scanned : text
      const hadNoAnswer = text.includes(NO_ANSWER_MARKER)
      const cleanContent = finalContent.replace(NO_ANSWER_MARKER, '').trim()

      // Salva mensagem do usuário + resposta
      if (convId) {
        const { data: userMsg } = await supabase
          .from('oracle_messages')
          .insert({ conversation_id: convId, role: 'user', content: message })
          .select('id')
          .single()

        await supabase.from('oracle_messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content: cleanContent,
          chunk_ids: chunks.map((c) => c.chunk_id),
          model: CHAT_MODEL,
          tokens_input: usage?.inputTokens,
          tokens_output: usage?.outputTokens,
        })

        // Auto-cria pending question se Oracle não soube responder
        if (hadNoAnswer && userMsg) {
          await supabase.from('oracle_pending_questions').insert({
            question: message,
            conversation_id: convId,
            source: 'web',
          })
        }
      }
    },
  })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isCredits = /credit|quota|billing|insufficient|limit|payment|402/i.test(msg)
    const userMsg = isCredits
      ? 'O Oracle está temporariamente indisponível: créditos de API esgotados. Por favor, contate o time de tecnologia.'
      : 'Erro interno ao processar sua pergunta. Por favor, tente novamente.'
    return Response.json({ error: userMsg, details: msg }, { status: isCredits ? 402 : 500 })
  }

  // Inclui sources e conversation_id no header para o cliente
  const response = result.toUIMessageStreamResponse()
  const headers = new Headers(response.headers)
  headers.set('X-Conversation-Id', convId ?? '')
  headers.set('X-Sources', Buffer.from(JSON.stringify(sources)).toString('base64'))

  return new Response(response.body, { headers, status: response.status })
}
