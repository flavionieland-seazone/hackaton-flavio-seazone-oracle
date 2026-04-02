import path from 'path'
import { config } from 'dotenv'

// Load env vars BEFORE importing any module that reads process.env at module init time
config({ path: path.join(process.cwd(), '.env.local') })

async function main() {
  const { runSlackDigest } = await import('../lib/alexandria/slack-digest')
  const { supabase } = await import('../lib/supabase')

  const CHANNEL_ID = 'CDKD79F6F'
  const WEEK = 7 * 24 * 60 * 60

  // March 1, 2026 → now (1772323200 = 2026-03-01 00:00:00 UTC)
  const START = 1772323200
  const END = Math.floor(Date.now() / 1000)

  let cursor = START

  while (cursor < END) {
    const chunkEnd = Math.min(cursor + WEEK, END)
    const startDate = new Date(cursor * 1000).toISOString().slice(0, 10)
    const endDate = new Date(chunkEnd * 1000).toISOString().slice(0, 10)

    // Move cursor to start of this chunk
    await supabase.from('oracle_slack_digest_cursor').upsert({
      channel_id: CHANNEL_ID,
      last_ts: `${cursor}.000000`,
    })

    console.log(`\nProcessando ${startDate} → ${endDate}...`)

    const result = await runSlackDigest(CHANNEL_ID)
    console.log(`  Mensagens: ${result.messages_total}, Dias: ${result.days_processed}`)
    result.documents.forEach((d) => console.log(`  ✓ ${d.title} (${d.chunks_count} chunks)`))

    cursor = chunkEnd
  }

  console.log('\n✅ Backfill completo!')
}

main().catch(console.error)
