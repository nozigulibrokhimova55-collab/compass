export type Role = 'teacher' | 'student' | 'parent'

export const ROLE_LABEL: Record<Role, string> = {
  teacher: 'Physics Faculty',
  student: 'AP Physics 1 Student',
  parent: 'Parent & Guardian',
}

export const ROLE_HOME: Record<Role, string> = {
  teacher: '/app',
  student: '/app/reflections',
  parent: '/app/family',
}
