import { supabase } from '@/lib/supabase'

export interface ThreadHistory {
  conversationId: string | null
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}

export async function loadThreadHistory(channel: string, threadTs: string): Promise<ThreadHistory> {
  const { data: conv } = await supabase
    .from('oracle_conversations')
    .select('id')
    .eq('slack_channel', channel)
    .eq('slack_thread_ts', threadTs)
    .single()

  if (!conv) return { conversationId: null, messages: [] }

  const { data: msgs } = await supabase
    .from('oracle_messages')
    .select('role, content')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true })

  return {
    conversationId: conv.id,
    messages: (msgs ?? []) as Array<{ role: 'user' | 'assistant'; content: string }>,
  }
}
