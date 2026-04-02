import { slack } from '@/lib/slack/client'
import { supabase } from '@/lib/supabase'
import { processWithToth } from './toth'
import { parseDocument, chunkDocument } from '@/lib/chunker'
import { embedDocuments } from '@/lib/embeddings'

const CHANNEL_NAME = 'comunicados-seazone'

interface SlackMessage {
  ts: string
  user?: string
  bot_id?: string
  subtype?: string
  text?: string
  reply_count?: number
  thread_ts?: string
}

function tsToDate(ts: string): Date {
  return new Date(parseFloat(ts) * 1000)
}

function formatTime(ts: string, tz = 'America/Sao_Paulo'): string {
  return tsToDate(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: tz })
}

function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  const d = new Date(Number(year), Number(month) - 1, Number(day))
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

async function resolveUserNames(userIds: string[]): Promise<Record<string, string>> {
  const names: Record<string, string> = {}
  for (const id of userIds) {
    try {
      const res = await slack.users.info({ user: id })
      if (res.user) {
        names[id] = res.user.profile?.display_name || res.user.real_name || id
      }
    } catch {
      names[id] = id
    }
  }
  return names
}

async function fetchAllMessages(channelId: string, oldest: string): Promise<SlackMessage[]> {
  const messages: SlackMessage[] = []
  let cursor: string | undefined

  do {
    const res = await slack.conversations.history({
      channel: channelId,
      oldest,
      limit: 200,
      cursor,
    })

    const batch = (res.messages ?? []) as SlackMessage[]
    messages.push(...batch)
    cursor = res.response_metadata?.next_cursor ?? undefined
  } while (cursor)

  return messages
}

async function fetchThreadReplies(channelId: string, threadTs: string): Promise<SlackMessage[]> {
  try {
    const res = await slack.conversations.replies({ channel: channelId, ts: threadTs })
    const replies = (res.messages ?? []) as SlackMessage[]
    // First message is the parent — skip it, return only replies
    return replies.slice(1)
  } catch {
    return []
  }
}

function isHumanMessage(msg: SlackMessage): boolean {
  return !msg.bot_id && !msg.subtype && !!msg.text?.trim()
}

function groupByDay(messages: SlackMessage[]): Record<string, SlackMessage[]> {
  const groups: Record<string, SlackMessage[]> = {}
  for (const msg of messages) {
    const date = tsToDate(msg.ts).toISOString().slice(0, 10) // YYYY-MM-DD in UTC
    if (!groups[date]) groups[date] = []
    groups[date].push(msg)
  }
  return groups
}

async function compileDay(
  channelId: string,
  dateStr: string,
  messages: SlackMessage[],
  userNames: Record<string, string>
): Promise<string> {
  const lines: string[] = [`Comunicados Seazone — ${formatDateLabel(dateStr)}`, '']

  // Only top-level messages (not replies)
  const topLevel = messages.filter((m) => !m.thread_ts || m.thread_ts === m.ts)

  for (const msg of topLevel) {
    if (!isHumanMessage(msg)) continue
    const author = msg.user ? (userNames[msg.user] ?? msg.user) : 'Desconhecido'
    lines.push(`## ${formatTime(msg.ts)} — ${author}`)
    lines.push(msg.text ?? '')

    // Fetch replies if thread exists
    if (msg.reply_count && msg.reply_count > 0) {
      const replies = await fetchThreadReplies(channelId, msg.ts)
      const humanReplies = replies.filter(isHumanMessage)
      if (humanReplies.length > 0) {
        lines.push('')
        lines.push('### Respostas:')
        for (const reply of humanReplies) {
          const replyAuthor = reply.user ? (userNames[reply.user] ?? reply.user) : 'Desconhecido'
          lines.push(`- **${replyAuthor} (${formatTime(reply.ts)}):** ${reply.text ?? ''}`)
        }
      }
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

async function ingestDay(
  dateStr: string,
  rawText: string
): Promise<{ title: string; section: string; file_path: string; chunks_count: number }> {
  const { markdown, section, title } = await processWithToth({
    rawText,
    fileName: `comunicados-${dateStr}.txt`,
    userNotes: `Comunicados internos do canal #${CHANNEL_NAME} — ${formatDateLabel(dateStr)}`,
  })

  const filePath = `01-institucional/comunicados-${dateStr}.md`
  const parsed = parseDocument(markdown, filePath)
  const chunks = chunkDocument(parsed)
  const embeddings = await embedDocuments(chunks.map((c) => c.content))

  const { data: doc, error: docError } = await supabase
    .from('oracle_documents')
    .upsert(
      {
        file_path: filePath,
        title,
        doc_type: parsed.frontmatter.type ?? 'referencia',
        section,
        confianca: 'media',
        fonte: 'slack-digest',
        status: 'ativo',
        raw_content: markdown,
        content_hash: Buffer.from(markdown).toString('base64').slice(0, 64),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'file_path' }
    )
    .select('id')
    .single()

  if (docError || !doc) throw new Error(docError?.message ?? 'Erro ao salvar documento')

  await supabase.from('oracle_chunks').delete().eq('document_id', doc.id)
  await supabase.from('oracle_chunks').insert(
    chunks.map((chunk, i) => ({
      document_id: doc.id,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      heading_path: chunk.headingPath,
      token_count: chunk.tokenCount,
      embedding: embeddings[i],
    }))
  )

  return { title, section, file_path: filePath, chunks_count: chunks.length }
}

export async function runSlackDigest(channelId: string): Promise<{
  days_processed: number
  messages_total: number
  documents: Array<{ title: string; section: string; file_path: string; chunks_count: number }>
}> {
  // 1. Busca cursor
  const { data: cursorRow } = await supabase
    .from('oracle_slack_digest_cursor')
    .select('last_ts')
    .eq('channel_id', channelId)
    .single()

  // Se não houver cursor, pega mensagens das últimas 24h
  const oldest = cursorRow?.last_ts ?? String(Math.floor(Date.now() / 1000) - 86400)

  // 2. Busca mensagens
  const allMessages = await fetchAllMessages(channelId, oldest)
  const humanMessages = allMessages.filter(isHumanMessage)

  if (humanMessages.length === 0) {
    return { days_processed: 0, messages_total: 0, documents: [] }
  }

  // 3. Resolve nomes de usuários únicos
  const userIds = [...new Set(humanMessages.map((m) => m.user).filter(Boolean) as string[])]
  const userNames = await resolveUserNames(userIds)

  // 4. Agrupa por dia e processa
  const grouped = groupByDay(humanMessages)
  const documents = []

  for (const [dateStr, msgs] of Object.entries(grouped).sort()) {
    const rawText = await compileDay(channelId, dateStr, msgs, userNames)
    if (rawText.trim().length < 50) continue
    const doc = await ingestDay(dateStr, rawText)
    documents.push(doc)
  }

  // 5. Atualiza cursor com o ts mais recente
  const latestTs = allMessages[0]?.ts ?? oldest
  await supabase.from('oracle_slack_digest_cursor').upsert({
    channel_id: channelId,
    last_ts: latestTs,
    last_run_at: new Date().toISOString(),
    messages_processed: humanMessages.length,
  })

  return {
    days_processed: documents.length,
    messages_total: humanMessages.length,
    documents,
  }
}
