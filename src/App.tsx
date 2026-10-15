import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AreaShell, type AreaNavItem } from './components/area/AreaShell'
import type { Person } from './components/ui/ThreadCard'
import DesignSystem from './pages/DesignSystem'
import GetStarted from './pages/GetStarted'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { ClassDataProvider, useClassData } from './lib/classData'
import { initialsOf } from './lib/people'
import { ROLE_HOME, type Role } from './lib/roles'
import { PARENT, STUDENTS, TEACHER } from './lib/sample'
import { useSession } from './lib/session'
import { isSupabaseConfigured } from './lib/supabase'

const TeacherOverview = lazy(() => import('./pages/teacher/Overview'))
const TeacherAttendance = lazy(() => import('./pages/teacher/Attendance'))
const TeacherQuizzes = lazy(() => import('./pages/teacher/Quizzes'))
const StudentHome = lazy(() => import('./pages/student/Home'))
const StudentQuiz = lazy(() => import('./pages/student/Quiz'))
const ComingSoon = lazy(() => import('./pages/ComingSoon'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

const TEACHER_NAV: AreaNavItem[] = [
  { to: '/teacher', label: 'Overview', icon: 'space_dashboard', end: true },
  { to: '/teacher/attendance', label: 'Attendance', icon: 'how_to_reg' },
  { to: '/teacher/quizzes', label: 'Quizzes', icon: 'quiz' },
]

const STUDENT_NAV: AreaNavItem[] = [{ to: '/student', label: 'Quizzes', icon: 'quiz', end: true }]

const minji = STUDENTS[0]

/** Who is shown in the sidebar for the sample class. */
const DEMO_PEOPLE: Record<Role, Person & { title: string }> = {
  teacher: { name: TEACHER.name, initials: TEACHER.initials, tone: 'orange', title: 'Teacher' },
  student: { name: minji.name, initials: minji.initials, title: 'Student' },
  parent: { name: PARENT.name, initials: PARENT.initials, tone: 'beige', title: 'Minji’s parent' },
}

const ROLE_TITLE: Record<Role, string> = { teacher: 'Teacher', student: 'Student', parent: 'Parent' }

function PageFallback() {
  return <p className="pt-24 text-center font-inter text-[15px] text-navy">Loading…</p>
}

/**
 * Keeps each area to the right people. Without Supabase everything is open (it's the demo). With it, you
 * must be logged in, and you can only open your own area. The sample "Ms. Park" session can look at all three.
 */
function Protected({ role, children }: { role: Role; children: ReactNode }) {
  const { session, loading } = useSession()
  if (!isSupabaseConfigured) return children
  if (loading) return <PageFallback />
  if (!session) return <Navigate to="/login" replace />
  if (session.demo || session.role === role) return children
  return <Navigate to={ROLE_HOME[session.role]} replace />
}

/** The sidebar and top bar for one area, filled in with the demo people or the signed-in person. */
function AreaFrame({ role, nav }: { role: Role; nav: AreaNavItem[] }) {
  const { user, isDemo } = useSession()
  const { cls } = useClassData()
  const person = isDemo ? DEMO_PEOPLE[role] : { name: user.name, initials: initialsOf(user.name), tone: DEMO_PEOPLE[role].tone, title: ROLE_TITLE[role] }
  return <AreaShell role={role} person={person} nav={nav} classLabel={cls?.name ?? ''} />
}

function Area({ role, nav }: { role: Role; nav: AreaNavItem[] }) {
  const { user, isDemo } = useSession()
  return (
    <Protected role={role}>
      {/* The key starts a fresh load whenever a different person (or the demo) opens this area. */}
      <ClassDataProvider key={isDemo ? 'demo' : user.id} role={role}>
        <AreaFrame role={role} nav={nav} />
      </ClassDataProvider>
    </Protected>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/design" element={<DesignSystem />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/teacher" element={<Area role="teacher" nav={TEACHER_NAV} />}>
          <Route index element={<TeacherOverview />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="quizzes" element={<TeacherQuizzes />} />
        </Route>
        <Route path="/student" element={<Area role="student" nav={STUDENT_NAV} />}>
          <Route index element={<StudentHome />} />
          <Route path="quiz/:quizId" element={<StudentQuiz />} />
        </Route>
        <Route path="/parent" element={<Area role="parent" nav={[]} />}>
          <Route index element={<ComingSoon />} />
        </Route>

        {/* The old /app workspace is retired; keep its links working. */}
        <Route path="/app/*" element={<Navigate to="/teacher" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
