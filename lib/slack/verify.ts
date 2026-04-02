import { createHmac, timingSafeEqual } from 'crypto'

const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET!
const MAX_AGE_SECONDS = 60 * 5 // 5 minutes

export function verifySlackSignature(headers: Headers, rawBody: string): boolean {
  const signature = headers.get('x-slack-signature')
  const timestamp = headers.get('x-slack-request-timestamp')

  if (!signature || !timestamp) return false

  // Replay attack protection: reject requests older than 5 minutes
  const age = Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp, 10))
  if (age > MAX_AGE_SECONDS) return false

  const sigBase = `v0:${timestamp}:${rawBody}`
  const expected = `v0=${createHmac('sha256', SIGNING_SECRET).update(sigBase).digest('hex')}`

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}
