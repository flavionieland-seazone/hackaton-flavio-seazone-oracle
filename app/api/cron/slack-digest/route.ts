import { runSlackDigest } from '@/lib/alexandria/slack-digest'

export const runtime = 'nodejs'
export const maxDuration = 300

const DIGEST_CHANNEL = 'CDKD79F6F'

export async function GET(request: Request): Promise<Response> {
  const auth = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`

  if (!process.env.CRON_SECRET || auth !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const result = await runSlackDigest(DIGEST_CHANNEL)
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error('[slack-digest cron] error:', err)
    return Response.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
