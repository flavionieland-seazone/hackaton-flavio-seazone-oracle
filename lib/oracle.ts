import { streamText, stepCountIs, convertToModelMessages } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { retrieve, buildContext, buildSystemPrompt, extractSources } from '@/lib/rag'
import { screenInput, scanOutput } from '@/lib/privacy'
import { CHAT_MODEL, NO_ANSWER_MARKER } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { metabaseSearchCards, metabaseRunCard, metabaseExploreSchema, metabaseRunSql } from '@/lib/metabase'
import { nektQuery } from '@/lib/nekt'
import type { SourceCitation } from '@/types'
import type { UIMessage } from 'ai'

const _openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
})
// Use .chat() explicitly — OpenRouter only supports /v1/chat/completions, not the Responses API
const openrouterModel = _openrouter.chat(CHAT_MODEL)

export const oracleTools = {
  metabase_search_cards: metabaseSearchCards,
  metabase_run_card: metabaseRunCard,
  metabase_explore_schema: metabaseExploreSchema,
  metabase_run_sql: metabaseRunSql,
  nekt_query: nektQuery,
}

export class OracleBlockedError extends Error {
  constructor(public reason: string) {
    super(reason)
  }
}

export interface OracleInput {
  message: string
  conversationId?: string
  /** Web: full UIMessage history (preserves tool calls). Slack: simple role+content array. */
  uiMessages?: UIMessage[]
  simpleHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  filters?: { bu?: string; section?: string }
  source: 'web' | 'slack'
  slackChannel?: string
  slackThreadTs?: string
}

/** Minimal interface over streamText result so callers don't need to import ai types */
export interface OracleStreamHandle {
  /** Full response text (awaitable) */
  text: Promise<string>
  /** Streaming response for web clients */
  toUIMessageStreamResponse: () => Response
}

export interface OracleStreamResult {
  streamResult: OracleStreamHandle
  conversationId: string
  sources: SourceCitation[]
}

export async function runOracle(input: OracleInput): Promise<OracleStreamResult> {
  const { message, conversationId, uiMessages, simpleHistory, filters, source, slackChannel, slackThreadTs } = input

  // Layer 1: input screening
  const inputCheck = screenInput(message)
  if (inputCheck.blocked) {
    throw new OracleBlockedError(inputCheck.reason ?? 'Pergunta bloqueada por política de privacidade.')
  }

  // Recover or create conversation
  let convId = conversationId
  if (!convId) {
    if (source === 'slack' && slackChannel && slackThreadTs) {
      const { data: existing } = await supabase
        .from('oracle_conversations')
        .select('id')
        .eq('slack_channel', slackChannel)
        .eq('slack_thread_ts', slackThreadTs)
        .single()
      convId = existing?.id
    }

    if (!convId) {
      const { data: conv } = await supabase
        .from('oracle_conversations')
        .insert({
          source,
          slack_channel: slackChannel ?? null,
          slack_thread_ts: slackThreadTs ?? null,
        })
        .select('id')
        .single()
      convId = conv?.id
    }
  }

  // RAG retrieval
  const chunks = await retrieve(message, filters)
  const context = buildContext(chunks)
  const systemPrompt = buildSystemPrompt(context)
  const sources = extractSources(chunks)

  // Build message array for the model
  type CoreMsg = { role: 'user' | 'assistant'; content: string }
  let coreMessages: CoreMsg[]

  if (uiMessages && uiMessages.length > 0) {
    // Web: convert UIMessages preserving tool call/result history
    coreMessages = (await convertToModelMessages(uiMessages, {
      tools: oracleTools,
      ignoreIncompleteToolCalls: true,
    }))
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: typeof m.content === 'string' ? m.content : '',
      }))
      .filter((m) => m.content.length > 0)
  } else if (simpleHistory && simpleHistory.length > 0) {
    // Slack: plain history from DB + new message
    coreMessages = [...simpleHistory, { role: 'user' as const, content: message }]
  } else {
    coreMessages = [{ role: 'user' as const, content: message }]
  }

  const streamResult = streamText({
    model: openrouterModel,
    system: systemPrompt,
    messages: coreMessages,
    tools: oracleTools,
    toolChoice: 'auto',
    stopWhen: stepCountIs(20),
    onFinish: async ({ text, usage }) => {
      // Layer 2: output scanning
      const scanned = scanOutput(text)
      const finalContent = scanned !== text ? scanned : text
      const hadNoAnswer = text.includes(NO_ANSWER_MARKER)
      const cleanContent = finalContent.replace(NO_ANSWER_MARKER, '').trim()

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

        if (hadNoAnswer && userMsg) {
          await supabase.from('oracle_pending_questions').insert({
            question: message,
            conversation_id: convId,
            source,
          })
        }
      }
    },
  })

  const handle: OracleStreamHandle = {
    text: Promise.resolve(streamResult.text),
    toUIMessageStreamResponse: () => streamResult.toUIMessageStreamResponse(),
  }

  return { streamResult: handle, conversationId: convId ?? '', sources }
}
