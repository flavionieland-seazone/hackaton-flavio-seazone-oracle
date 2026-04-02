import { waitUntil } from '@vercel/functions'
import { verifySlackSignature } from '@/lib/slack/verify'
import { processSlackMessage } from '@/lib/slack/processor'
import type { SlackEventPayload } from '@/lib/slack/types'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const rawBody = await request.text()

  let body: SlackEventPayload
  try {
    body = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Slack URL verification challenge (sent once during Event Subscriptions setup)
  if (body.type === 'url_verification') {
    return Response.json({ challenge: body.challenge })
  }

  // Verify HMAC signature
  if (!verifySlackSignature(request.headers, rawBody)) {
    return new Response('Invalid signature', { status: 401 })
  }

  // Ignore Slack retries — we already acknowledged the original
  if (request.headers.get('x-slack-retry-num')) {
    return new Response('ok', { status: 200 })
  }

  // Process event asynchronously — respond to Slack immediately (< 3s rule)
  if (body.type === 'event_callback' && body.event) {
    const event = body.event

    const isDirectMessage = event.type === 'message' && event.channel_type === 'im'
    const isMention = event.type === 'app_mention'

    if ((isDirectMessage || isMention) && !event.bot_id && !event.subtype) {
      // waitUntil keeps the serverless function alive after the response is sent
      waitUntil(
        processSlackMessage(event).catch((err) => {
          console.error('[Slack] processSlackMessage error:', err)
        })
      )
    }
  }

  return new Response('ok', { status: 200 })
}
