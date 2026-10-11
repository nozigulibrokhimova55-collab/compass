// Sample class used by the redesigned pages. Every number shown on screen is computed from this data.

export type Mark = 'present' | 'late' | 'absent'

export const TEACHER = { name: 'Ms. Park', initials: 'MP', subject: 'Physics', email: 'ms.park@school.example' }

export const CLASS = { name: 'Physics 1, Period 3', code: 'PARK-P3', unit: 'Newton’s laws' }

export const STUDENTS = [
  { id: 'minji', name: 'Minji Kim', initials: 'MK' },
  { id: 'jisoo', name: 'Jisoo Lee', initials: 'JL' },
  { id: 'daniel', name: 'Daniel Cho', initials: 'DC' },
  { id: 'hana', name: 'Hana Choi', initials: 'HC' },
  { id: 'yuna', name: 'Yuna Jung', initials: 'YJ' },
  { id: 'leo', name: 'Leo Kang', initials: 'LK' },
  { id: 'sora', name: 'Sora Han', initials: 'SH' },
  { id: 'theo', name: 'Theo Lim', initials: 'TL' },
]

export const PARENT = { name: 'Mrs. Kim', initials: 'SK', child: 'minji' }

/** This week's attendance, one entry per school day. Missing students were present. */
export const ATTENDANCE: { date: string; day: string; marks: Partial<Record<string, Mark>> }[] = [
  { date: '2026-10-05', day: 'Mon', marks: { leo: 'late' } },
  { date: '2026-10-06', day: 'Tue', marks: { daniel: 'absent' } },
  { date: '2026-10-07', day: 'Wed', marks: { minji: 'late', daniel: 'absent' } },
  { date: '2026-10-08', day: 'Thu', marks: { sora: 'absent' } },
  { date: '2026-10-09', day: 'Fri', marks: { leo: 'late' } },
]

export function markFor(day: (typeof ATTENDANCE)[number], studentId: string): Mark {
  return day.marks[studentId] ?? 'present'
}

/** Attendance totals for the whole class, or for one student. "Late" still counts as attending. */
export function attendanceStats(studentId?: string) {
  const ids = studentId ? [studentId] : STUDENTS.map((s) => s.id)
  let total = 0
  let absent = 0
  let late = 0
  for (const day of ATTENDANCE) {
    for (const id of ids) {
      total++
      const mark = markFor(day, id)
      if (mark === 'absent') absent++
      if (mark === 'late') late++
    }
  }
  return { rate: Math.round(((total - absent) / total) * 100), absent, late, days: ATTENDANCE.length }
}

/** How well Minji knows each topic, from her quiz answers (0 to 1). */
export const TOPICS = [
  { id: 'first-law', name: 'Newton’s first law', mastery: 0.82 },
  { id: 'free-body', name: 'Free-body diagrams', mastery: 0.71 },
  { id: 'second-law', name: 'Newton’s second law', mastery: 0.64 },
  { id: 'third-law', name: 'Newton’s third law', mastery: 0.48 },
]

export const QUIZZES = [
  { id: 'q4', title: 'Quiz 4: Forces and motion', due: 'Fri, Oct 16', questions: 8, done: false },
  { id: 'q3', title: 'Quiz 3: Free-body diagrams', due: 'Fri, Oct 9', questions: 6, done: true, score: 5 },
  { id: 'q2', title: 'Quiz 2: Newton’s first law', due: 'Fri, Oct 2', questions: 6, done: true, score: 6 },
]

export function quizStats() {
  const done = QUIZZES.filter((q) => q.done)
  return { completed: done.length, assigned: QUIZZES.length }
}

/** The demo's "today": the Monday after the sample week. Attendance for it starts unmarked. */
export const TODAY = { date: '2026-10-12', day: 'Mon', label: 'Mon, Oct 12' }

/** Quiz 3 scores (out of 6) for the whole class. Minji's matches her entry in QUIZZES. */
export const QUIZ3_SCORES: Record<string, number> = { minji: 5, jisoo: 6, daniel: 3, hana: 4, yuna: 6, leo: 4, sora: 3, theo: 4 }

/** The common mistake found in Quiz 3 (carried over from the old dashboard). */
export const MISCONCEPTION = {
  quiz: 'Quiz 3: Free-body diagrams',
  idea: 'a moving object needs a constant push to keep moving.',
  questions: [2, 5],
  students: ['daniel', 'hana', 'leo', 'sora', 'theo'],
  detail: 'They drew a forward force on a cart rolling at a steady speed. With no friction, nothing has to push it to keep it going.',
  topicId: 'first-law',
}

/** Short activities for the next class, aimed at the misconception. */
export const LESSON_IDEAS = [
  { time: '5 min demo', title: 'Puck on an air table vs. a block on sandpaper', text: 'Friction slows things down. Motion doesn’t just run out on its own.' },
  { time: '7 min pair talk', title: 'Why does Voyager keep moving with its engines off?', text: 'Pairs explain why a moving object keeps going without a push.' },
  { time: '3 min exit check', title: 'Two quick free-body diagrams on a frictionless track', text: 'A fast check that the idea stuck before class ends.' },
]

export type Question = { id: string; topicId: string; text: string; options: string[]; answer: number; why: string }

/** A small set of sample questions. The demo quiz maker picks from these; nothing is generated live. */
export const QUESTION_BANK: Question[] = [
  { id: 'f1', topicId: 'first-law', text: 'A cart rolls at a steady speed on a smooth floor. Is there a net force on it?', options: ['Yes, or it would stop', 'No, the forces balance', 'Yes, pointing forward', 'Only gravity'], answer: 1, why: 'Steady speed in a straight line means the forces balance, so the net force is zero.' },
  { id: 'f2', topicId: 'first-law', text: 'A hockey puck slides across ice and slowly stops. Why does it stop?', options: ['Its force runs out', 'Friction from the ice', 'Gravity pulls it back', 'Air pushes it forward'], answer: 1, why: 'A small friction force acts against the motion. Without it, the puck would keep sliding.' },
  { id: 'f3', topicId: 'first-law', text: 'You are in a bus that brakes hard. Why do you lurch forward?', options: ['The bus pushes you', 'Your body keeps moving forward', 'Gravity changes direction', 'The seat pulls you'], answer: 1, why: 'Your body keeps moving at the old speed until something, like the seat belt, stops it.' },
  { id: 'f4', topicId: 'first-law', text: 'A space probe far from any planet turns its engines off. What happens?', options: ['It slows down and stops', 'It keeps moving at the same speed', 'It falls back to Earth', 'It speeds up'], answer: 1, why: 'With no force acting on it, the probe keeps moving at a constant speed.' },
  { id: 's1', topicId: 'second-law', text: 'The same push is given to an empty cart and a full cart. Which speeds up more?', options: ['The empty cart', 'The full cart', 'Both the same', 'Neither moves'], answer: 0, why: 'With the same force, less mass means more acceleration (F = ma).' },
  { id: 's2', topicId: 'second-law', text: 'A 2 kg ball has a net force of 10 N on it. What is its acceleration?', options: ['2 m/s²', '5 m/s²', '10 m/s²', '20 m/s²'], answer: 1, why: 'a = F ÷ m = 10 N ÷ 2 kg = 5 m/s².' },
  { id: 's3', topicId: 'second-law', text: 'You double the net force on a box. What happens to its acceleration?', options: ['It halves', 'It stays the same', 'It doubles', 'It goes up four times'], answer: 2, why: 'Acceleration grows in step with net force when the mass stays the same.' },
  { id: 's4', topicId: 'second-law', text: 'Two forces act on a sled: 30 N forward and 10 N backward. What is the net force?', options: ['40 N forward', '20 N forward', '20 N backward', '10 N forward'], answer: 1, why: 'Subtract opposite forces: 30 N minus 10 N leaves 20 N forward.' },
  { id: 't1', topicId: 'third-law', text: 'You push on a wall. What does the wall do?', options: ['Nothing', 'Pushes back on you just as hard', 'Pushes back a little less', 'Pulls you toward it'], answer: 1, why: 'Forces come in pairs: the wall pushes on you with the same size force.' },
  { id: 't2', topicId: 'third-law', text: 'Why don’t action and reaction forces cancel each other out?', options: ['They do cancel', 'They act on different objects', 'One is always bigger', 'They point the same way'], answer: 1, why: 'Each force in the pair acts on a different object, so they can’t cancel.' },
  { id: 't3', topicId: 'third-law', text: 'A swimmer pushes water backward. What moves the swimmer forward?', options: ['The water pushing forward on them', 'Their own muscles alone', 'Gravity', 'Air above the water'], answer: 0, why: 'The swimmer pushes the water back, and the water pushes the swimmer forward.' },
  { id: 't4', topicId: 'third-law', text: 'A truck hits a small car. Which feels the bigger force?', options: ['The truck', 'The car', 'They feel the same force', 'Neither feels a force'], answer: 2, why: 'The forces are equal. The car speeds up more because it has less mass.' },
  { id: 'd1', topicId: 'free-body', text: 'A book rests on a table. Which forces belong on its free-body diagram?', options: ['Gravity only', 'Gravity and the table pushing up', 'The table pushing up only', 'Gravity and a forward push'], answer: 1, why: 'Gravity pulls down and the table pushes up with the same size force.' },
  { id: 'd2', topicId: 'free-body', text: 'A ball is thrown straight up. Once it leaves your hand, which force acts on it?', options: ['An upward throwing force', 'Gravity only (ignoring air)', 'Gravity and an upward force', 'No force at the top'], answer: 1, why: 'After it leaves your hand, only gravity acts on it (ignoring air).' },
  { id: 'd3', topicId: 'free-body', text: 'A lamp hangs from a cord. What balances gravity on the lamp?', options: ['The ceiling', 'The tension in the cord', 'Air pressure', 'Nothing'], answer: 1, why: 'The cord pulls up on the lamp with a tension equal to its weight.' },
  { id: 'd4', topicId: 'free-body', text: 'A box slides to the right and slows down. Which way does friction point?', options: ['Right', 'Left', 'Up', 'Down'], answer: 1, why: 'Friction points against the motion, so it points left.' },
]
