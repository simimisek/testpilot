import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ProjectDetail from '@/components/ProjectDetail'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*, organization:organizations(id, name)')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: tests } = await supabase
    .from('tests')
    .select('*')
    .eq('project_id', id)
    .eq('archived', false)
    .order('id')

  return <ProjectDetail project={project} tests={tests || []} />
}
