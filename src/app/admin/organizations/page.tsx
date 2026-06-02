import { createClient } from '@/lib/supabase/server'
import OrganizationsAdmin from '@/components/admin/OrganizationsAdmin'

export default async function OrganizationsPage() {
  const supabase = await createClient()

  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name, created_at')
    .order('name')

  return <OrganizationsAdmin organizations={organizations || []} />
}
