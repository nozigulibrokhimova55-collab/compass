export type Role = 'teacher' | 'student' | 'parent'

export const ROLE_HOME: Record<Role, string> = {
  teacher: '/teacher',
  student: '/student',
  parent: '/parent',
}
