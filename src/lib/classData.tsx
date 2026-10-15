import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { errorMessage, fetchMyClass, fetchMyQuizzes, fetchQuizForStudent, fetchQuizzes, fetchRoster, submitQuiz, type ClassInfo, type QuizAnswer, type QuizSummary, type StudentQuiz, type StudentQuizDetail } from './db'
import { initialsOf } from './people'
import type { Role } from './roles'
import { CLASS, STUDENTS } from './sample'
import { useSession } from './session'
import { demoQuizDetail, demoStudentQuizzes, demoSubmit } from './studentDemo'

export type ClassStudent = { id: string; name: string; initials: string }

type State = {
  loading: boolean
  error: string | null
  cls: ClassInfo | null
  students: ClassStudent[]
  quizzes: QuizSummary[]
  /** For students: the class's published quizzes and how they did. */
  studentQuizzes: StudentQuiz[]
}

type ClassDataValue = State & {
  /** True for the sample class. False when the data comes from Supabase. */
  isDemo: boolean
  reload: () => Promise<void>
  /** A student opens one quiz. Answers and reasons are included only once it is finished. */
  openQuiz: (quizId: string) => Promise<StudentQuizDetail>
  /** A student finishes a quiz. Returns it with the right answers. */
  finishQuiz: (quizId: string, answers: QuizAnswer[]) => Promise<StudentQuizDetail>
}

const DEMO_STATE: State = {
  loading: false,
  error: null,
  cls: { id: 'demo', name: CLASS.name, code: CLASS.code, unit: CLASS.unit },
  students: STUDENTS,
  quizzes: [],
  studentQuizzes: demoStudentQuizzes(),
}

const NOTHING: State = { loading: false, error: null, cls: null, students: [], quizzes: [], studentQuizzes: [] }

const ClassDataContext = createContext<ClassDataValue | null>(null)

/**
 * The signed-in person's class, in one place. Teachers also get their roster and quizzes; students get
 * the class they joined; parents get nothing yet. The demo gets the sample class from sample.ts.
 */
export function ClassDataProvider({ role, children }: { role: Role; children: ReactNode }) {
  const { isDemo } = useSession()
  const needsLoad = !isDemo && role !== 'parent'
  const [state, setState] = useState<State>(() => (isDemo ? DEMO_STATE : needsLoad ? { ...NOTHING, loading: true } : NOTHING))
  const latest = useRef(0)

  // Fetches the real class. `quiet` is for refreshing after a change: if it fails, keep showing what we already have.
  const load = useCallback(async (quiet = false) => {
    const run = ++latest.current
    try {
      const cls = await fetchMyClass()
      let students: ClassStudent[] = []
      let quizzes: QuizSummary[] = []
      let studentQuizzes: StudentQuiz[] = []
      if (cls && role === 'teacher') {
        const [roster, list] = await Promise.all([fetchRoster(cls.id), fetchQuizzes(cls.id)])
        students = roster.map((s) => ({ ...s, initials: initialsOf(s.name) }))
        quizzes = list
      }
      if (cls && role === 'student') studentQuizzes = await fetchMyQuizzes()
      if (run === latest.current) setState({ loading: false, error: null, cls, students, quizzes, studentQuizzes })
    } catch (err) {
      console.error('Could not load the class', err)
      if (!quiet && run === latest.current) setState({ ...NOTHING, error: errorMessage(err, 'We couldn’t load your class.') })
    }
  }, [role])

  // The demo and parents start with their final state, so only real accounts need to fetch.
  // (App.tsx remounts this provider when the person or role changes, so the initial state is always right.)
  useEffect(() => {
    // `load` only sets state after its network calls finish, never synchronously.
    // oxlint-disable-next-line react/set-state-in-effect
    if (needsLoad) load()
  }, [load, needsLoad])

  const reload = useCallback(async () => {
    if (needsLoad) await load(true)
  }, [load, needsLoad])

  // The sample student's answers for quizzes finished during this visit (nothing is saved anywhere).
  const [demoChoices, setDemoChoices] = useState<Record<string, number[]>>({})

  const openQuiz = useCallback(
    async (quizId: string) => {
      if (isDemo) {
        const detail = demoQuizDetail(quizId, demoChoices[quizId])
        if (!detail) throw new Error('We could not find that quiz.')
        return detail
      }
      return fetchQuizForStudent(quizId)
    },
    [isDemo, demoChoices],
  )

  const finishQuiz = useCallback(
    async (quizId: string, answers: QuizAnswer[]) => {
      if (isDemo) {
        const { choices, score } = demoSubmit(quizId, answers)
        setDemoChoices((c) => ({ ...c, [quizId]: choices }))
        setState((st) => ({ ...st, studentQuizzes: st.studentQuizzes.map((q) => (q.id === quizId ? { ...q, finished: true, score } : q)) }))
        const detail = demoQuizDetail(quizId, choices)
        if (!detail) throw new Error('We could not find that quiz.')
        return detail
      }
      const detail = await submitQuiz(quizId, answers)
      await load(true)
      return detail
    },
    [isDemo, load],
  )

  const value = useMemo(() => ({ ...state, isDemo, reload, openQuiz, finishQuiz }), [state, isDemo, reload, openQuiz, finishQuiz])
  return <ClassDataContext.Provider value={value}>{children}</ClassDataContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useClassData() {
  const ctx = useContext(ClassDataContext)
  if (!ctx) throw new Error('useClassData must be used inside <ClassDataProvider>')
  return ctx
}
