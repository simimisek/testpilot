import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfilePage from '@/components/ProfilePage'

export default async function Profile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRows } = await supabase.rpc('get_my_profile')
  const profile = profileRows?.[0] ?? null

  let orgName = ''
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .single()
    orgName = org?.name ?? ''
  }

  return (
    <ProfilePage
      userId={user.id}
      email={user.email ?? ''}
      fullName={profile?.full_name ?? ''}
      role={profile?.role ?? 'member'}
      orgName={orgName}
    />
  )
}
