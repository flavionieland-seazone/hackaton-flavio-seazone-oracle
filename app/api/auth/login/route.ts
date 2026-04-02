import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ALLOWED_DOMAIN = 'seazone.com.br'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hackaton-flavio-seazone-oracle.vercel.app'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: Request) {
  const { email } = await req.json() as { email?: string }

  if (!email) {
    return NextResponse.json({ error: 'Email obrigatório.' }, { status: 400 })
  }

  const domain = email.split('@')[1]?.toLowerCase()
  if (domain !== ALLOWED_DOMAIN) {
    return NextResponse.json({ error: 'Acesso restrito a emails @seazone.com.br.' }, { status: 403 })
  }

  // Gerar magic link via admin (não requer OTP habilitado no projeto)
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    console.error('[auth/login] generateLink error:', error)
    return NextResponse.json({ error: 'Erro ao enviar link. Tente novamente.' }, { status: 500 })
  }

  // Supabase envia o email automaticamente ao gerar o link
  console.log('[auth/login] magic link sent to', email, '— action_link domain:', data.properties?.action_link?.slice(0, 60))

  return NextResponse.json({ ok: true })
}
