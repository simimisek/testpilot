export type Role = 'app_admin' | 'member'

export interface Organization {
  id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  role: Role
  organization_id: string | null
  organization?: Organization
}

export interface Project {
  id: string
  name: string
  organization_id: string
  created_at: string
  updated_at: string
  last_import_at: string | null
  last_export_at: string | null
}

export interface TestCase {
  id: number
  test_id: string
  project_id: string
  area: string
  name: string
  description: string
  steps: string
  expected_result: string
  notes: string
  priority: 'High' | 'Medium' | 'Low' | ''
  status: 'Ready to Test' | 'Pass' | 'Fail' | 'Blocked' | 'Skipped' | 'Not Relevant'
  last_test_date: string
  build: string
  bug_id: string
  run_note: string
  archived: boolean
  position: number
}
