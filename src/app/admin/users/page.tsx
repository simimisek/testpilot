import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import UsersAdmin from '@/components/admin/UsersAdmin'

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: rawUsers } = await supabase
    .from('profiles')
    .select('id, full_name, role, organization_id, created_at')
    .order('created_at', { ascending: false })

  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name')
    .order('name')

  // Fetch emails from auth.users via admin client
  let emailMap = new Map<string, string>()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && serviceKey) {
    const admin = createAdminClient(url, serviceKey)
    const { data: authUsers } = await admin.auth.admin.listUsers()
    if (authUsers?.users) {
      authUsers.users.forEach(u => emailMap.set(u.id, u.email ?? ''))
    }
  }

  const orgMap = new Map((organizations || []).map(o => [o.id, o.name]))
  const users = (rawUsers || []).map(u => ({
    ...u,
    email: emailMap.get(u.id) || '',
    organization: u.organization_id
      ? { id: u.organization_id, name: orgMap.get(u.organization_id) || '' }
      : null
  }))

  return <UsersAdmin users={users} organizations={organizations || []} />
}
