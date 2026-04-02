import { NO_ANSWER_MARKER } from '@/lib/constants'

const SLACK_MAX_LENGTH = 3800 // safe limit below 4000

/**
 * Converts Oracle's Markdown output to Slack's mrkdwn format.
 */
export function markdownToMrkdwn(md: string): string {
  return (
    md
      // Strip Oracle internal marker
      .replace(NO_ANSWER_MARKER, '')
      // Convert Markdown tables to preformatted blocks (Slack has no table support)
      .replace(/(\|.+\|\n)+/g, (table) => `\`\`\`\n${table.replace(/\|/g, '|').trim()}\n\`\`\`\n`)
      // Convert headings: # Heading → *Heading*
      .replace(/^#{1,3} (.+)$/gm, '*$1*')
      // Bold: **text** → *text* (must happen before italic)
      .replace(/\*\*(.+?)\*\*/g, '*$1*')
      // Italic: *text* that is NOT Slack bold (single asterisks not already converted)
      // Use underscores for italic since * is now bold in mrkdwn
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '_$1_')
      // Italic with underscores: _text_ → _text_ (already mrkdwn, keep as-is)
      // Links: [text](url) → <url|text>
      .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<$2|$1>')
      // Strip non-http links (internal references)
      .replace(/\[(.+?)\]\([^)]*\)/g, '$1')
      .trim()
  )
}

/**
 * Splits a long mrkdwn string into chunks that fit Slack's message limit.
 * Tries to split on double newlines (paragraph breaks) to avoid mid-sentence cuts.
 */
export function splitMessage(text: string): string[] {
  if (text.length <= SLACK_MAX_LENGTH) return [text]

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > SLACK_MAX_LENGTH) {
    // Find the last paragraph break within the limit
    const slice = remaining.slice(0, SLACK_MAX_LENGTH)
    const lastBreak = slice.lastIndexOf('\n\n')
    const cutAt = lastBreak > SLACK_MAX_LENGTH / 2 ? lastBreak : SLACK_MAX_LENGTH

    chunks.push(remaining.slice(0, cutAt).trim())
    remaining = remaining.slice(cutAt).trim()
  }

  if (remaining.length > 0) chunks.push(remaining)
  return chunks
}
