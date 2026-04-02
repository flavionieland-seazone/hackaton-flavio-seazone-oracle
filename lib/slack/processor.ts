import { slack } from './client'
import { loadThreadHistory } from './thread-context'
import { markdownToMrkdwn, splitMessage } from './format'
import { runOracle, OracleBlockedError } from '@/lib/oracle'
import { supabase } from '@/lib/supabase'
import type { SlackMessageEvent } from './types'

const BOT_USER_ID = process.env.SLACK_BOT_USER_ID ?? ''

// Teaching mode prefix regex
const TEACH_REGEX = /^(?:ensinar|ensine|cadastrar|registrar|adicionar\s+conhecimento)\s*:\s*/i

/**
 * Strips the @mention prefix from messages sent via app_mention events.
 */
function stripMention(text: string): string {
  return text.replace(/^<@[A-Z0-9]+>\s*/i, '').trim()
}

/**
 * Detects if the user is providing knowledge (teaching) vs asking a question.
 */
function detectTeachingMode(text: string): { isTeaching: boolean; knowledge: string } {
  const match = TEACH_REGEX.exec(text)
  if (match) {
    return { isTeaching: true, knowledge: text.slice(match[0].length).trim() }
  }
  return { isTeaching: false, knowledge: '' }
}

/**
 * Handles a teaching command: saves the knowledge as a pending question for admin review.
 */
async function handleTeaching(
  knowledge: string,
  channel: string,
  threadTs: string,
  userId: string | undefined
): Promise<void> {
  await supabase.from('oracle_pending_questions').insert({
    question: '(Via Slack)',
    answer: knowledge,
    source: 'slack',
    status: 'pending',
    answered_by: userId ?? null,
  })

  await slack.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text: 'Obrigado! A informação foi registrada e será revisada pela equipe antes de ser adicionada à base de conhecimento. :white_check_mark:',
  })
}

/**
 * Main async processor for Slack events. Fire-and-forget from the route handler.
 */
export async function processSlackMessage(event: SlackMessageEvent): Promise<void> {
  // Skip bot messages to avoid infinite loops
  if (event.bot_id || event.subtype) return

  // Only handle message events in DMs and app_mention events in channels
  const isDM = event.channel_type === 'im'
  const isMention = event.type === 'app_mention'
  if (!isDM && !isMention) return

  const rawText = event.text ?? ''
  const cleanText = stripMention(rawText).trim()
  if (!cleanText) return

  const channel = event.channel
  const threadTs = event.thread_ts ?? event.ts
  const userId = event.user

  // Add ⏳ reaction to indicate processing
  try {
    await slack.reactions.add({ channel, timestamp: event.ts, name: 'hourglass_flowing_sand' })
  } catch {
    // Reaction may already exist or bot lacks permission — not fatal
  }

  try {
    // Detect teaching vs asking
    const { isTeaching, knowledge } = detectTeachingMode(cleanText)

    if (isTeaching) {
      await handleTeaching(knowledge, channel, threadTs, userId)
      return
    }

    // Load thread conversation history
    const { conversationId, messages: history } = await loadThreadHistory(channel, threadTs)

    // Call the Oracle core
    const { streamResult } = await runOracle({
      message: cleanText,
      conversationId: conversationId ?? undefined,
      simpleHistory: history.length > 0 ? history : undefined,
      source: 'slack',
      slackChannel: channel,
      slackThreadTs: threadTs,
    })

    // Await the full text (Slack needs complete response, not a stream)
    const fullText = await streamResult.text

    // Convert Markdown to Slack mrkdwn and split if needed
    const mrkdwn = markdownToMrkdwn(fullText)
    const parts = splitMessage(mrkdwn)

    // Post each part in the thread
    for (const part of parts) {
      await slack.chat.postMessage({
        channel,
        thread_ts: threadTs,
        text: part,
        mrkdwn: true,
      })
    }
  } catch (err) {
    const isBlocked = err instanceof OracleBlockedError
    const errorText = isBlocked
      ? `:no_entry: ${(err as OracleBlockedError).reason}`
      : ':warning: Ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.'

    try {
      await slack.chat.postMessage({ channel, thread_ts: threadTs, text: errorText })
    } catch {
      // If we can't even post the error, log it
      console.error('Failed to post Slack error message:', err)
    }
  } finally {
    // Always remove the ⏳ reaction
    try {
      await slack.reactions.remove({ channel, timestamp: event.ts, name: 'hourglass_flowing_sand' })
    } catch {
      // Ignore — reaction may already be gone
    }
  }
}
