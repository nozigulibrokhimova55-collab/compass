// Sample data for screens the database can't fill yet, read through small hooks.
//
// Every hook here has a TODO saying what Supabase needs before it can be connected.
// Screens show a "Sample" tag on anything that comes from this file, so nobody mistakes it for real class data.
// Anything a teacher changes here (today's topic, approvals, "this is wrong") is kept in this browser only.

import { useCallback, useMemo, useSyncExternalStore } from 'react'

// ---------------------------------------------------------------------------
// Quiz topics
// ---------------------------------------------------------------------------

/**
 * The topics a teacher can pick when making a quiz.
 * These ids must match TOPICS in supabase/functions/generate-quiz/validate.ts, or "Make questions" refuses them.
 * TODO(Mauricio): move topics into a table (per class or per unit) and read them in db.ts.
 */
export const QUIZ_TOPICS = [
  { id: 'first-law', name: 'Newton’s first law' },
  { id: 'free-body', name: 'Free-body diagrams' },
  { id: 'second-law', name: 'Newton’s second law' },
  { id: 'third-law', name: 'Newton’s third law' },
]

// ---------------------------------------------------------------------------
// Browser-only store for what a teacher changes on sample screens
// ---------------------------------------------------------------------------

export type PlanStep = { minutes: number; title: string; text: string }

type Saved = {
  /** Today's topic, keyed by `classId:YYYY-MM-DD`. */
  topics: Record<string, string>
  /** How sure a student was of each answer, keyed by `userId:quizId`, then question id. */
  confidence: Record<string, Record<string, Confidence>>
  /** Retry schedule for each missed question, keyed by `userId:questionId`. */
  retries: Record<string, RetryState>
  /** Catch-up checks a student finished, keyed by `userId:YYYY-MM-DD`, with the score. */
  checks: Record<string, number>
  /** Parents: the child picked in the switcher. */
  child: string | null
  /** Parents: preferred language, once changed in Settings. */
  language: string | null
  /** Parents: invite codes checked in Settings, waiting to be linked. */
  pendingLinks: string[]
  /** Parents: replies to the teacher, per child. */
  replies: Record<string, { text: string; time: string }[]>
  /** Evidence ids the teacher marked "this is wrong". */
  flagged: string[]
  /** Review plans the teacher approved or edited. */
  plans: Record<string, { approved?: boolean; steps?: PlanStep[] }>
}

const STORE_KEY = 'compass.sampleData'
const EMPTY: Saved = { topics: {}, confidence: {}, retries: {}, checks: {}, child: null, language: null, pendingLinks: [], replies: {}, flagged: [], plans: {} }

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Saved>) } : EMPTY
  } catch {
    return EMPTY
  }
}

let saved: Saved = load()
const listeners = new Set<() => void>()

function update(change: (s: Saved) => Saved) {
  saved = change(saved)
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(saved))
  } catch {
    /* storage unavailable: changes last until the page reloads */
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function useSaved() {
  return useSyncExternalStore(subscribe, () => saved)
}

// ---------------------------------------------------------------------------
// Today's topic (teacher attendance; later used for students' catch-up cards)
// ---------------------------------------------------------------------------

/**
 * What the class covered on a day. The teacher types it on the Attendance page.
 * TODO(Mauricio): add a `class_days (class_id, day, topic)` table, save it with the attendance, and read it here.
 */
export function useDayTopic(classId: string | undefined, day: string) {
  const s = useSaved()
  const key = `${classId ?? 'none'}:${day}`
  const topic = s.topics[key] ?? ''
  const save = useCallback((text: string) => update((st) => ({ ...st, topics: { ...st.topics, [key]: text.trim() } })), [key])
  return { topic, save, isSample: true as const }
}

// ---------------------------------------------------------------------------
// Misconceptions for a quiz, the answers behind them, and review plans
// ---------------------------------------------------------------------------

export type Confidence = 'sure' | 'not_sure' | 'guessed'

/** One student's wrong answer that points to a misconception. */
export type Evidence = {
  id: string
  student: string
  questionNumber: number
  question: string
  answer: string
  rightAnswer: string
  confidence: Confidence
}

type SampleMisconception = {
  id: string
  /** Finishes the sentence "N students think…". */
  idea: string
  /** One plain sentence about what the answers show. */
  detail: string
  questions: number[]
  evidence: Evidence[]
  plan: PlanStep[]
}

export type Misconception = Omit<SampleMisconception, 'plan'> & {
  /** Students still counted, after any "this is wrong" marks. */
  students: number
  /** Of those, how many said they were sure of their wrong answer. */
  confidentWrong: number
  flagged: Set<string>
}

export type ReviewPlan = {
  id: string
  misconceptionId: string
  idea: string
  quizTitle: string
  steps: PlanStep[]
  minutes: number
  approved: boolean
  edited: boolean
}

const SAMPLE_QUIZ = { title: 'Quiz 3: Free-body diagrams', className: 'Physics 1, Period 3', students: 8 }

const Q2 = 'A cart rolls at a steady speed on a smooth floor. Which forces act on it?'
const Q2_RIGHT = 'Gravity down and the floor pushing up'
const Q3 = 'A ball is thrown straight up. Once it leaves your hand, which forces act on it?'
const Q3_RIGHT = 'Gravity only (ignoring air)'
const Q4 = 'You push on a heavy box and it slides. The box pushes back on you just as hard. Why does it still move?'
const Q4_RIGHT = 'The two forces act on different objects'
const Q5 = 'A hockey puck slides across very smooth ice. What keeps it moving?'
const Q5_RIGHT = 'Nothing has to. It keeps going on its own'

const SAMPLE_MISCONCEPTIONS: SampleMisconception[] = [
  {
    id: 'push-to-move',
    idea: 'a moving object needs a constant push to keep moving.',
    detail: 'They drew a forward force on a cart rolling at a steady speed. With no friction, nothing has to push it to keep it going.',
    questions: [2, 5],
    evidence: [
      { id: 'e1', student: 'Daniel Cho', questionNumber: 2, question: Q2, answer: 'Gravity, the floor, and a forward push', rightAnswer: Q2_RIGHT, confidence: 'sure' },
      { id: 'e2', student: 'Hana Choi', questionNumber: 2, question: Q2, answer: 'Gravity, the floor, and a forward push', rightAnswer: Q2_RIGHT, confidence: 'not_sure' },
      { id: 'e3', student: 'Leo Kang', questionNumber: 5, question: Q5, answer: 'The force from the stick, still pushing it', rightAnswer: Q5_RIGHT, confidence: 'sure' },
      { id: 'e4', student: 'Sora Han', questionNumber: 2, question: Q2, answer: 'Gravity, the floor, and a forward push', rightAnswer: Q2_RIGHT, confidence: 'sure' },
      { id: 'e5', student: 'Theo Lim', questionNumber: 5, question: Q5, answer: 'The force from the stick, still pushing it', rightAnswer: Q5_RIGHT, confidence: 'guessed' },
    ],
    plan: [
      { minutes: 3, title: 'Air table puck vs. block on sandpaper', text: 'Slide both. Ask: what slowed the block down? Friction did, the motion didn’t run out.' },
      { minutes: 4, title: 'Pair talk: the space probe', text: 'Why does a probe far from any planet keep moving with its engines off? Pairs explain it in one sentence.' },
      { minutes: 3, title: 'Exit check', text: 'Draw the forces on a cart at a steady speed, once with friction and once without.' },
    ],
  },
  {
    id: 'pairs-cancel',
    idea: 'action and reaction forces cancel each other out.',
    detail: 'They said the box shouldn’t move because the two pushes are equal. Each force acts on a different object, so they can’t cancel.',
    questions: [4],
    evidence: [
      { id: 'e6', student: 'Minji Kim', questionNumber: 4, question: Q4, answer: 'It shouldn’t move, the forces cancel', rightAnswer: Q4_RIGHT, confidence: 'not_sure' },
      { id: 'e7', student: 'Daniel Cho', questionNumber: 4, question: Q4, answer: 'Your push is a little bigger', rightAnswer: Q4_RIGHT, confidence: 'guessed' },
      { id: 'e8', student: 'Yuna Jung', questionNumber: 4, question: Q4, answer: 'It shouldn’t move, the forces cancel', rightAnswer: Q4_RIGHT, confidence: 'sure' },
    ],
    plan: [
      { minutes: 3, title: 'Rolling chairs', text: 'Two students on rolling chairs push off each other. Both move, so the forces didn’t cancel.' },
      { minutes: 4, title: 'Two diagrams, not one', text: 'Draw the box and the student as separate drawings, with one force from the pair on each.' },
      { minutes: 3, title: 'Exit check', text: 'A swimmer pushes water back. Which force moves the swimmer, and what is it acting on?' },
    ],
  },
  {
    id: 'force-of-throw',
    idea: 'a thrown ball still has the force of the throw on it.',
    detail: 'They added an upward force after the ball left the hand. Once it’s in the air, only gravity acts on it (ignoring air).',
    questions: [3],
    evidence: [
      { id: 'e9', student: 'Hana Choi', questionNumber: 3, question: Q3, answer: 'Gravity and the force of the throw', rightAnswer: Q3_RIGHT, confidence: 'sure' },
      { id: 'e10', student: 'Theo Lim', questionNumber: 3, question: Q3, answer: 'Gravity and the force of the throw', rightAnswer: Q3_RIGHT, confidence: 'sure' },
    ],
    plan: [
      { minutes: 3, title: 'Slow-motion toss', text: 'Film a ball toss on a phone and pause it three times on the way up.' },
      { minutes: 4, title: 'Diagram each pause', text: 'At each pause, draw every force on the ball. Ask what is touching it.' },
      { minutes: 3, title: 'Exit check', text: 'A ball at the very top of its path: which forces act on it right then?' },
    ],
  },
]

const totalMinutes = (steps: PlanStep[]) => steps.reduce((sum, s) => sum + s.minutes, 0)

/**
 * The mix-ups behind wrong answers on a quiz, with the answers each one is based on.
 * Counts leave out anything the teacher marked "this is wrong".
 * For now every quiz shows the same sample report (Ms. Park's Quiz 3), so the page can show how it will look.
 * TODO(Mauricio): needs the AI step that groups wrong answers into misconceptions, a `misconceptions` table
 * (quiz_id, idea, detail, question numbers), the student answers behind each one, a `confidence` column on
 * quiz_responses, and a table for "this is wrong" flags. Then read them here by `quizId`.
 */
export function useMisconceptions(quizId: string | undefined) {
  const s = useSaved()
  const misconceptions: Misconception[] = useMemo(() => {
    const flagged = new Set(s.flagged)
    return SAMPLE_MISCONCEPTIONS.map(({ plan: _plan, ...m }) => {
      const kept = m.evidence.filter((e) => !flagged.has(e.id))
      return { ...m, students: kept.length, confidentWrong: kept.filter((e) => e.confidence === 'sure').length, flagged }
    }).sort((a, b) => b.students - a.students)
  }, [s.flagged])

  const setFlag = useCallback((evidenceId: string, on: boolean) => {
    update((st) => ({ ...st, flagged: on ? [...new Set([...st.flagged, evidenceId])] : st.flagged.filter((id) => id !== evidenceId) }))
  }, [])

  return {
    isSample: true as const,
    quizId,
    quizTitle: SAMPLE_QUIZ.title,
    className: SAMPLE_QUIZ.className,
    totalStudents: SAMPLE_QUIZ.students,
    misconceptions,
    setFlag,
  }
}

/**
 * A suggested 10-minute review for each misconception, waiting for the teacher to approve or edit.
 * TODO(Mauricio): needs the AI step that writes the plans and a `review_plans` table (misconception_id, steps jsonb,
 * approved_at, edited). Approving should save there; parents and students could then see what's planned.
 */
export function useReviewPlans() {
  const s = useSaved()
  const plans: ReviewPlan[] = useMemo(
    () =>
      SAMPLE_MISCONCEPTIONS.map((m) => {
        const mine = s.plans[m.id] ?? {}
        const steps = mine.steps ?? m.plan
        return {
          id: m.id,
          misconceptionId: m.id,
          idea: m.idea,
          quizTitle: SAMPLE_QUIZ.title,
          steps,
          minutes: totalMinutes(steps),
          approved: Boolean(mine.approved),
          edited: Boolean(mine.steps),
        }
      }),
    [s.plans],
  )

  const approve = useCallback((id: string, approved = true) => {
    update((st) => ({ ...st, plans: { ...st.plans, [id]: { ...st.plans[id], approved } } }))
  }, [])

  /** Saving an edit also approves it: the teacher has just checked every step. */
  const saveSteps = useCallback((id: string, steps: PlanStep[]) => {
    update((st) => ({ ...st, plans: { ...st.plans, [id]: { steps, approved: true } } }))
  }, [])

  return { isSample: true as const, plans, waiting: plans.filter((p) => !p.approved), approve, saveSteps }
}

// ---------------------------------------------------------------------------
// Students: confidence, topic progress, retry schedule, catch-up checks
// ---------------------------------------------------------------------------

/** How sure a student was of their answers on one quiz. */
export function useConfidence(userId: string | undefined, quizId: string) {
  const s = useSaved()
  const key = `${userId ?? 'none'}:${quizId}`
  const map = s.confidence[key] ?? {}
  /**
   * TODO(Mauricio): add a `confidence` column ('sure' | 'not_sure' | 'guessed') to quiz_responses and accept it in
   * submit_quiz, so teachers' reports can count "sure but wrong" from real answers. Then drop this store.
   */
  const save = useCallback((next: Record<string, Confidence>) => update((st) => ({ ...st, confidence: { ...st.confidence, [key]: next } })), [key])
  return { confidence: map, save, isSample: true as const }
}

export type TopicProgress = {
  id: string
  name: string
  /** 0 to 1, one value per week, oldest first. The last one is now. */
  weeks: number[]
}

const SAMPLE_PROGRESS: TopicProgress[] = [
  { id: 'first-law', name: 'Newton’s first law', weeks: [0.5, 0.62, 0.74, 0.82] },
  { id: 'free-body', name: 'Free-body diagrams', weeks: [0.35, 0.48, 0.6, 0.71] },
  { id: 'second-law', name: 'Newton’s second law', weeks: [0.4, 0.5, 0.58, 0.64] },
  { id: 'third-law', name: 'Newton’s third law', weeks: [0.42, 0.45, 0.44, 0.48] },
]

/** Plain words for a progress level. No grades, no rankings. */
export function progressWords(level: number) {
  if (level >= 0.8) return 'Solid'
  if (level >= 0.6) return 'Getting there'
  return 'Still learning'
}

/**
 * How a student is doing on each topic over the last four weeks, plus the plain-words summary
 * ("strong at", "keep working on", "getting better at"). Parents see the same summary.
 * TODO(Mauricio): return each question's topic_id from my_quizzes / quiz_for_student (it's already in quiz_questions),
 * then work this out per topic and week from quiz_responses. Same shape: { id, name, weeks: number[] }.
 */
export function useTopicProgress() {
  return useMemo(() => {
    const now = (t: TopicProgress) => t.weeks[t.weeks.length - 1]
    const gain = (t: TopicProgress) => now(t) - t.weeks[0]
    const byLevel = [...SAMPLE_PROGRESS].sort((a, b) => now(b) - now(a))
    return {
      isSample: true as const,
      topics: SAMPLE_PROGRESS,
      strongest: byLevel[0],
      workingOn: byLevel[byLevel.length - 1],
      improving: [...SAMPLE_PROGRESS].sort((a, b) => gain(b) - gain(a))[0],
    }
  }, [])
}

export type RetryState = {
  /** YYYY-MM-DD the question is next due. */
  due: string
  /** Right answers in a row on retries. Two means it's learned. */
  streak: number
}

const RETRY_FIRST_GAP = 2
const RETRY_SECOND_GAP = 7
export const RETRY_GOAL = 2

function addDaysIso(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * When each missed question comes back: 2 days after the miss, then 7 days after the first right retry,
 * and it's done after two right retries in a row. A wrong retry starts it over at 2 days.
 * TODO(Mauricio): add a `retry_schedule (student_id, question_id, due, streak)` table, write it in submit_quiz
 * for wrong answers and in a new submit_retry function, and read it here.
 */
export function useRetrySchedule(userId: string | undefined) {
  const s = useSaved()
  const prefix = `${userId ?? 'none'}:`

  /** The schedule for a question. Questions seen for the first time start 2 days from `missedOn`. */
  const stateFor = useCallback(
    (questionId: string, missedOn: string): RetryState => s.retries[prefix + questionId] ?? { due: addDaysIso(missedOn, RETRY_FIRST_GAP), streak: 0 },
    [s.retries, prefix],
  )

  const record = useCallback(
    (results: { questionId: string; right: boolean }[], today: string) => {
      update((st) => {
        const retries = { ...st.retries }
        for (const r of results) {
          const streak = r.right ? (retries[prefix + r.questionId]?.streak ?? 0) + 1 : 0
          retries[prefix + r.questionId] = { streak, due: addDaysIso(today, r.right ? RETRY_SECOND_GAP : RETRY_FIRST_GAP) }
        }
        return { ...st, retries }
      })
    },
    [prefix],
  )

  return { stateFor, record, isSample: true as const }
}

export type CheckQuestion = { id: string; text: string; options: string[]; answer: number; why: string }

const CHECK_BANK: Record<string, CheckQuestion[]> = {
  'first-law': [
    { id: 'c-f1', text: 'A cart rolls at a steady speed on a smooth floor. Is there a net force on it?', options: ['Yes, or it would stop', 'No, the forces balance', 'Yes, pointing forward', 'Only gravity'], answer: 1, why: 'Steady speed in a straight line means the forces balance, so the net force is zero.' },
    { id: 'c-f2', text: 'A hockey puck slides across ice and slowly stops. Why does it stop?', options: ['Its force runs out', 'Friction from the ice', 'Gravity pulls it back', 'Air pushes it forward'], answer: 1, why: 'A small friction force acts against the motion. Without it, the puck would keep sliding.' },
    { id: 'c-f3', text: 'You are on a bus that brakes hard. Why do you lurch forward?', options: ['The bus pushes you', 'Your body keeps moving forward', 'Gravity changes direction', 'The seat pulls you'], answer: 1, why: 'Your body keeps moving at the old speed until something, like a seat belt, stops it.' },
  ],
  'free-body': [
    { id: 'c-d1', text: 'A book rests on a table. Which forces belong on its free-body diagram?', options: ['Gravity only', 'Gravity and the table pushing up', 'The table pushing up only', 'Gravity and a forward push'], answer: 1, why: 'Gravity pulls down and the table pushes up with the same size force.' },
    { id: 'c-d2', text: 'A ball is thrown straight up. Once it leaves your hand, which force acts on it?', options: ['An upward throwing force', 'Gravity only (ignoring air)', 'Gravity and an upward force', 'No force at the top'], answer: 1, why: 'After it leaves your hand, only gravity acts on it (ignoring air).' },
    { id: 'c-d3', text: 'A box slides to the right and slows down. Which way does friction point?', options: ['Right', 'Left', 'Up', 'Down'], answer: 1, why: 'Friction points against the motion, so it points left.' },
  ],
  'second-law': [
    { id: 'c-s1', text: 'The same push is given to an empty cart and a full cart. Which speeds up more?', options: ['The empty cart', 'The full cart', 'Both the same', 'Neither moves'], answer: 0, why: 'With the same force, less mass means more acceleration (F = ma).' },
    { id: 'c-s2', text: 'A 2 kg ball has a net force of 10 N on it. What is its acceleration?', options: ['2 m/s²', '5 m/s²', '10 m/s²', '20 m/s²'], answer: 1, why: 'a = F ÷ m = 10 N ÷ 2 kg = 5 m/s².' },
    { id: 'c-s3', text: 'You double the net force on a box. What happens to its acceleration?', options: ['It halves', 'It stays the same', 'It doubles', 'It goes up four times'], answer: 2, why: 'Acceleration grows in step with net force when the mass stays the same.' },
  ],
  'third-law': [
    { id: 'c-t1', text: 'You push on a wall. What does the wall do?', options: ['Nothing', 'Pushes back on you just as hard', 'Pushes back a little less', 'Pulls you toward it'], answer: 1, why: 'Forces come in pairs: the wall pushes on you with the same size force.' },
    { id: 'c-t2', text: 'Why don’t action and reaction forces cancel each other out?', options: ['They do cancel', 'They act on different objects', 'One is always bigger', 'They point the same way'], answer: 1, why: 'Each force in the pair acts on a different object, so they can’t cancel.' },
    { id: 'c-t3', text: 'A swimmer pushes water backward. What moves the swimmer forward?', options: ['The water pushing on them', 'Their muscles alone', 'Gravity', 'The air above the water'], answer: 0, why: 'The swimmer pushes the water back, and the water pushes the swimmer forward.' },
  ],
}

/**
 * A 3-question catch-up check for a day the student missed, picked by matching the day's topic to a quiz topic.
 * TODO(Mauricio): let generate-quiz write checks for students from the teacher's day topic (it only lets teachers in
 * now), or have the teacher's app write one per day into a `catch_up_checks` table. Save scores there too.
 */
export function useCatchUpCheck(userId: string | undefined, day: string, topic: string) {
  const s = useSaved()
  const lower = topic.toLowerCase()
  const match =
    QUIZ_TOPICS.find((t) => lower && lower.includes(t.name.toLowerCase().replace('newton’s ', ''))) ??
    (/(first|inertia)/.test(lower) ? QUIZ_TOPICS[0] : /(diagram|free)/.test(lower) ? QUIZ_TOPICS[1] : /(second|f ?= ?ma|accel)/.test(lower) ? QUIZ_TOPICS[2] : /(third|pair|reaction)/.test(lower) ? QUIZ_TOPICS[3] : QUIZ_TOPICS[0])
  const key = `${userId ?? 'none'}:${day}`
  const score = s.checks[key]
  const saveScore = useCallback((right: number) => update((st) => ({ ...st, checks: { ...st.checks, [key]: right } })), [key])
  return { isSample: true as const, topicName: match.name, questions: CHECK_BANK[match.id], score, saveScore }
}

// ---------------------------------------------------------------------------
// Parents: children, the weekly update, messages, settings
// ---------------------------------------------------------------------------

export type MessageSection = 'this_week' | 'working_on' | 'how_to_help'

export type ChildUpdate = {
  id: string
  name: string
  firstName: string
  initials: string
  className: string
  teacher: { name: string; initials: string }
  weekLabel: string
  /** "This week" statement: the headline, its orange last line, and one or two plain sentences. */
  thisWeek: { title: string; highlight: string; body: string }
  strengths: { topic: string; text: string }[]
  workingOn: { topic: string; text: string }[]
  attendance: { here: number; late: number; missed: number; days: number }
  askTonight: string
  topics: TopicProgress[]
  quizzes: { title: string; when: string; plain: string; done: boolean }[]
  messages: { section: MessageSection; time: string; text: string }[]
}

const SAMPLE_CHILDREN: ChildUpdate[] = [
  {
    id: 'minji',
    name: 'Minji Kim',
    firstName: 'Minji',
    initials: 'MK',
    className: 'Physics 1, Period 3',
    teacher: { name: 'Ms. Park', initials: 'MP' },
    weekLabel: 'Oct 26 to Oct 30',
    thisWeek: {
      title: 'Minji had a steady week and',
      highlight: 'finished every quiz on time.',
      body: 'She got 5 of 6 right on the free-body diagrams quiz. She still mixes up the two forces in a pair, which is very normal at this point.',
    },
    strengths: [
      { topic: 'Newton’s first law', text: 'Explains why a moving thing keeps moving.' },
      { topic: 'Free-body diagrams', text: 'Draws the forces on an object sitting still.' },
    ],
    workingOn: [{ topic: 'Newton’s third law', text: 'Why the two forces in a pair don’t cancel out.' }],
    attendance: { here: 4, late: 1, missed: 0, days: 5 },
    askTonight: 'Ask Minji why a rolling ball eventually stops.',
    topics: SAMPLE_PROGRESS,
    quizzes: [
      { title: 'Quiz 4: Forces and motion', when: 'Due Fri, Nov 6', plain: 'Not started yet. There’s still time.', done: false },
      { title: 'Quiz 3: Free-body diagrams', when: 'Fri, Oct 30', plain: '5 of 6 right. She missed one question about forces in pairs.', done: true },
      { title: 'Quiz 2: Newton’s first law', when: 'Fri, Oct 23', plain: 'All 6 right.', done: true },
    ],
    messages: [
      { section: 'this_week', time: 'Fri 3:40 PM', text: 'Hi Mrs. Kim. Minji finished the free-body diagrams quiz and got 5 of 6 right. She was a few minutes late on Wednesday, nothing to worry about.' },
      { section: 'working_on', time: 'Fri 3:41 PM', text: 'We’re on Newton’s third law. Minji sometimes thinks the two forces in a pair cancel out. We’ll practice that on Monday with a short demo.' },
      { section: 'how_to_help', time: 'Fri 3:42 PM', text: 'At dinner, push your palms against hers and ask: who pushed harder? You both pushed the same. That’s the whole idea.' },
    ],
  },
  {
    id: 'joon',
    name: 'Joon Kim',
    firstName: 'Joon',
    initials: 'JK',
    className: 'Biology 9, Period 2',
    teacher: { name: 'Mr. Ortiz', initials: 'MO' },
    weekLabel: 'Oct 26 to Oct 30',
    thisWeek: {
      title: 'Joon missed one class and',
      highlight: 'caught up with the check.',
      body: 'He was out on Tuesday and did the 3-question catch-up the next day. He’s quick with cell parts and still building up photosynthesis.',
    },
    strengths: [{ topic: 'Cell parts', text: 'Names what each part of a cell does.' }],
    workingOn: [
      { topic: 'Photosynthesis', text: 'Where a plant’s food actually comes from.' },
      { topic: 'Food chains', text: 'Which way the energy moves.' },
    ],
    attendance: { here: 4, late: 0, missed: 1, days: 5 },
    askTonight: 'Ask Joon what a plant needs to make its own food.',
    topics: [
      { id: 'cells', name: 'Cell parts', weeks: [0.55, 0.66, 0.74, 0.84] },
      { id: 'photo', name: 'Photosynthesis', weeks: [0.3, 0.38, 0.47, 0.55] },
      { id: 'chains', name: 'Food chains', weeks: [0.5, 0.5, 0.53, 0.58] },
    ],
    quizzes: [
      { title: 'Quiz 3: Photosynthesis', when: 'Due Thu, Nov 5', plain: 'Not started yet.', done: false },
      { title: 'Quiz 2: Cell parts', when: 'Thu, Oct 29', plain: '4 of 5 right.', done: true },
    ],
    messages: [
      { section: 'this_week', time: 'Thu 4:10 PM', text: 'Hello. Joon was out on Tuesday and already did his catch-up check. Thanks for helping him stay on it.' },
      { section: 'working_on', time: 'Thu 4:11 PM', text: 'We’re on photosynthesis. Joon thinks plants get their food from the soil. Most of it comes from air and light.' },
      { section: 'how_to_help', time: 'Thu 4:12 PM', text: 'If you have a houseplant, ask him what it “eats.” Let him explain, then ask where the light goes.' },
    ],
  },
]

/**
 * The children this parent is linked to, and which one is picked.
 * TODO(Mauricio): add `fetchMyChildren()` to db.ts: parent_links joined with profiles (name) and class_members →
 * classes (name). Row level security already lets parents read all three for their own children.
 */
export function useChildren() {
  const s = useSaved()
  const selected = SAMPLE_CHILDREN.find((c) => c.id === s.child) ?? SAMPLE_CHILDREN[0]
  const select = useCallback((id: string) => update((st) => ({ ...st, child: id })), [])
  return { isSample: true as const, children: SAMPLE_CHILDREN, selected, select }
}

/**
 * The weekly update for one child: the "This week" summary, strengths, working on, attendance,
 * one thing to ask tonight, topic progress and recent quizzes. Same words the student sees.
 * TODO(Mauricio): attendance can come from the attendance table now (parents can read their child's rows). The rest
 * needs per-topic results (see useTopicProgress) and a `weekly_updates` table the teacher approves before parents see it.
 */
export function useParentUpdates(childId: string) {
  return { isSample: true as const, update: SAMPLE_CHILDREN.find((c) => c.id === childId) ?? SAMPLE_CHILDREN[0] }
}

/**
 * Messages with the teacher about one child, plus the parent's replies.
 * TODO(Mauricio): add a `messages (class_id, student_id, from_id, section, text, created_at)` table with row level
 * security for the teacher and the child's parents, and fetch/send functions in db.ts.
 */
export function useMessages(childId: string) {
  const s = useSaved()
  const replies = s.replies[childId] ?? []
  const send = useCallback(
    (text: string) => {
      const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      update((st) => ({ ...st, replies: { ...st.replies, [childId]: [...(st.replies[childId] ?? []), { text: text.trim(), time: `Today ${time}` }] } }))
    },
    [childId],
  )
  return { isSample: true as const, replies, send }
}

export const LANGUAGES = [
  { id: 'Korean', label: '한국어', english: 'Korean' },
  { id: 'English', label: 'English', english: 'English' },
  { id: 'Russian', label: 'Русский', english: 'Russian' },
  { id: 'Mongolian', label: 'Монгол', english: 'Mongolian' },
]

/**
 * A parent's preferred language and the invite codes waiting to be linked.
 * TODO(Mauricio): save the language with an `updateMyLanguage(language)` function in db.ts (profiles.language;
 * people may already update their own). Linking another child needs a `link_child(p_code)` database function
 * that inserts into parent_links, since parents can't insert there directly.
 */
export function useParentSettings() {
  const s = useSaved()
  const setLanguage = useCallback((language: string) => update((st) => ({ ...st, language })), [])
  const addPending = useCallback((code: string) => update((st) => ({ ...st, pendingLinks: [...new Set([...st.pendingLinks, code])] })), [])
  return { isSample: true as const, language: s.language ?? 'English', setLanguage, pendingLinks: s.pendingLinks, addPending }
}
