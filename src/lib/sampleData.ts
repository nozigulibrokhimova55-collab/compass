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
  /** Evidence ids the teacher marked "this is wrong". */
  flagged: string[]
  /** Review plans the teacher approved or edited. */
  plans: Record<string, { approved?: boolean; steps?: PlanStep[] }>
}

const STORE_KEY = 'compass.sampleData'
const EMPTY: Saved = { topics: {}, flagged: [], plans: {} }

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

