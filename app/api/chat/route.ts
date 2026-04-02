import { streamText, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { retrieve, buildContext, buildSystemPrompt, extractSources } from '@/lib/rag'
import { screenInput, scanOutput } from '@/lib/privacy'
import { CHAT_MODEL, NO_ANSWER_MARKER } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { metabaseSearchCards, metabaseRunCard, metabaseRunSql } from '@/lib/metabase'
import type { UIMessage } from 'ai'

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

  // RAG: recupera chunks relevantes
  const chunks = await retrieve(message, filters)
  const context = buildContext(chunks)
  const systemPrompt = buildSystemPrompt(context)
  const sources = extractSources(chunks)

  // Se a KB não tem resposta boa, força o uso de tools
  const bestSimilarity = chunks.length > 0 ? Math.max(...chunks.map((c) => c.similarity)) : 0
  const kbHasAnswer = bestSimilarity >= 0.55

  // Streaming com Gemini + tools Metabase
  const result = streamText({
    model: google(CHAT_MODEL),
    system: systemPrompt,
    messages: [{ role: 'user', content: message }],
    tools: {
      metabase_search_cards: metabaseSearchCards,
      metabase_run_card: metabaseRunCard,
      metabase_run_sql: metabaseRunSql,
    },
    toolChoice: kbHasAnswer ? 'auto' : 'required',
    stopWhen: stepCountIs(5),
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

  // Inclui sources e conversation_id no header para o cliente
  const response = result.toUIMessageStreamResponse()
  const headers = new Headers(response.headers)
  headers.set('X-Conversation-Id', convId ?? '')
  headers.set('X-Sources', Buffer.from(JSON.stringify(sources)).toString('base64'))

  return new Response(response.body, { headers, status: response.status })
}
