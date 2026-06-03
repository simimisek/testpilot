import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // Verify caller is app_admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'app_admin') return NextResponse.json({ error: 'Nemáš oprávnění' }, { status: 403 })

  const { email, password, fullName, orgId, role } = await req.json()
  if (!email || !password || !orgId) return NextResponse.json({ error: 'Chybí povinná pole' }, { status: 400 })

  // Use service role to create user
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: newUser, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Upsert profile with org and role (trigger may have already created a base row)
  const { error: profileError } = await admin.from('profiles').upsert({
    id: newUser.user.id,
    organization_id: orgId,
    role: role || 'member',
    full_name: fullName || null
  }, { onConflict: 'id' })

  if (profileError) return NextResponse.json({ error: 'Uživatel vytvořen, ale nepodařilo se nastavit profil: ' + profileError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
