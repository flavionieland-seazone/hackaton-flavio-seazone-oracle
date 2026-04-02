import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('oracle_pending_questions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function PATCH(request: Request) {
  const { id, status } = await request.json()

  const { error } = await supabase
    .from('oracle_pending_questions')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
