import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileRows } = await supabase.rpc('get_my_profile')
  const profile = profileRows?.[0] ?? null

  let organization = undefined
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, created_at')
      .eq('id', profile.organization_id)
      .single()
    organization = org ?? undefined
  }

  const fullProfile = profile ? { ...profile, organization } : null

  return <AppShell profile={fullProfile} user={user}>{children}</AppShell>
}
