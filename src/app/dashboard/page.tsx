import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProjectList from '@/components/ProjectList'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRows } = await supabase.rpc('get_my_profile')
  const profile = profileRows?.[0] ?? null
  const isAdmin = profile?.role === 'app_admin'

  let query = supabase
    .from('projects')
    .select('*, organization:organizations(id, name)')
    .order('updated_at', { ascending: false })

  if (!isAdmin && profile?.organization_id) {
    query = query.eq('organization_id', profile.organization_id)
  }

  const { data: projects } = await query

  return <ProjectList projects={projects || []} isAdmin={isAdmin} />
}
