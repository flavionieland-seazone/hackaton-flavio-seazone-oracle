import { runOracle, OracleBlockedError } from '@/lib/oracle'
import type { UIMessage } from 'ai'

export async function POST(request: Request) {
  const body = await request.json()

  // Supports two formats: { message } (curl/direct) and { messages } (DefaultChatTransport)
  let message: string = body.message ?? ''
  if (!message && Array.isArray(body.messages)) {
    const lastUser = [...body.messages].reverse().find((m: UIMessage) => m.role === 'user')
    const textPart = lastUser?.parts?.find((p: { type: string }) => p.type === 'text') as { type: 'text'; text: string } | undefined
    message = textPart?.text ?? ''
  }

  const conversation_id: string | undefined = body.conversation_id
  const filters: { bu?: string; section?: string } | undefined = body.filters
  const uiMessages = Array.isArray(body.messages) && body.messages.length > 0
    ? (body.messages as UIMessage[])
    : undefined

  try {
    const { streamResult, conversationId, sources } = await runOracle({
      message,
      conversationId: conversation_id,
      uiMessages,
      filters,
      source: 'web',
    })

    const response = streamResult.toUIMessageStreamResponse()
    const headers = new Headers(response.headers)
    headers.set('X-Conversation-Id', conversationId ?? '')
    headers.set('X-Sources', Buffer.from(JSON.stringify(sources)).toString('base64'))

    return new Response(response.body, { headers, status: response.status })
  } catch (err) {
    if (err instanceof OracleBlockedError) {
      return Response.json({ error: err.reason, blocked: true })
    }
    const msg = err instanceof Error ? err.message : String(err)
    const isCredits = /credit|quota|billing|insufficient|limit|payment|402/i.test(msg)
    const userMsg = isCredits
      ? 'O Oracle está temporariamente indisponível: créditos de API esgotados. Por favor, contate o time de tecnologia.'
      : 'Erro interno ao processar sua pergunta. Por favor, tente novamente.'
    return Response.json({ error: userMsg, details: msg }, { status: isCredits ? 402 : 500 })
  }
}
