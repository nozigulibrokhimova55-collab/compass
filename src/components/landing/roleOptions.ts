import type { Role } from '../../lib/roles'

/** The three roles, with what each one gets. Used by the role cards and sign-up. */
export const ROLE_OPTIONS: { id: Role; icon: string; title: string; text: string; as: string; chips: [string, string][] }[] = [
  {
    id: 'teacher',
    icon: 'school',
    title: 'Teachers',
    text: 'Make quizzes in minutes and see what your class really needs.',
    as: 'a teacher',
    chips: [
      ['quiz', 'Quiz maker'],
      ['how_to_reg', 'Attendance'],
      ['insights', 'Class gaps'],
    ],
  },
  {
    id: 'student',
    icon: 'backpack',
    title: 'Students',
    text: 'Practice the things you missed, at your own pace.',
    as: 'a student',
    chips: [
      ['edit_note', 'Practice quizzes'],
      ['replay', 'Retry mistakes'],
      ['event_available', 'Attendance'],
    ],
  },
  {
    id: 'parent',
    icon: 'family_restroom',
    title: 'Parents',
    text: 'See how your child is doing and how you can help.',
    as: 'a parent',
    chips: [
      ['mail', 'Weekly notes'],
      ['trending_up', 'Progress'],
      ['translate', 'Your language'],
    ],
  },
]
