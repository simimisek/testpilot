import { createClient } from '@/lib/supabase/server'
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

  const orgMap = new Map((organizations || []).map(o => [o.id, o.name]))
  const users = (rawUsers || []).map(u => ({
    ...u,
    organization: u.organization_id
      ? { id: u.organization_id, name: orgMap.get(u.organization_id) || '' }
      : null
  }))

  return <UsersAdmin users={users} organizations={organizations || []} />
}
