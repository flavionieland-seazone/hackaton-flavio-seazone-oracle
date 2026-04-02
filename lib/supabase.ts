import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Usar service role para todas as operações server-side do Oracle
export const supabase = createClient(supabaseUrl, serviceRoleKey)
