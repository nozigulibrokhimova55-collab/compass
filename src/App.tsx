import { lazy, Suspense, useEffect, type ReactNode } from 'react'
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
import { useSession } from './lib/session'
import { isSupabaseConfigured } from './lib/supabase'

const TeacherHome = lazy(() => import('./pages/teacher/Home'))
const TeacherAttendance = lazy(() => import('./pages/teacher/Attendance'))
const TeacherQuizzes = lazy(() => import('./pages/teacher/Quizzes'))
const TeacherReports = lazy(() => import('./pages/teacher/Reports'))
const TeacherReport = lazy(() => import('./pages/teacher/Report'))
const TeacherClass = lazy(() => import('./pages/teacher/Class'))
const StudentHome = lazy(() => import('./pages/student/Home'))
const StudentQuizzes = lazy(() => import('./pages/student/Quizzes'))
const StudentQuiz = lazy(() => import('./pages/student/Quiz'))
const StudentGaps = lazy(() => import('./pages/student/Gaps'))
const StudentAttendance = lazy(() => import('./pages/student/Attendance'))
const StudentRetry = lazy(() => import('./pages/student/Retry'))
const StudentCheck = lazy(() => import('./pages/student/Check'))
const AreaPlaceholder = lazy(() => import('./pages/AreaPlaceholder'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

const TEACHER_NAV: AreaNavItem[] = [
  { to: '/teacher', label: 'Home', icon: 'home', end: true },
  { to: '/teacher/attendance', label: 'Attendance', icon: 'how_to_reg' },
  { to: '/teacher/quizzes', label: 'Quizzes', icon: 'quiz' },
  { to: '/teacher/reports', label: 'Reports', icon: 'insights' },
  { to: '/teacher/class', label: 'Class', icon: 'groups' },
]

const STUDENT_NAV: AreaNavItem[] = [
  { to: '/student', label: 'Home', icon: 'home', end: true },
  { to: '/student/quizzes', label: 'Quizzes', icon: 'quiz' },
  { to: '/student/gaps', label: 'My gaps', icon: 'trending_up' },
  { to: '/student/attendance', label: 'Attendance', icon: 'calendar_month' },
]

const PARENT_NAV: AreaNavItem[] = [
  { to: '/parent', label: 'Home', icon: 'home', end: true },
  { to: '/parent/progress', label: 'Progress', icon: 'trending_up' },
  { to: '/parent/messages', label: 'Messages', icon: 'forum' },
  { to: '/parent/settings', label: 'Settings', icon: 'settings' },
]

const ROLE_TITLE: Record<Role, string> = { teacher: 'Teacher', student: 'Student', parent: 'Parent' }
const ROLE_TONE: Record<Role, Person['tone']> = { teacher: 'orange', student: 'blue', parent: 'beige' }

function PageFallback() {
  return <p className="pt-24 text-center font-inter text-[15px] text-navy">Loading…</p>
}

/**
 * Every area needs a real login, and each person can only open their own area.
 * Without Supabase keys nobody can log in, so the areas send you to /login (which explains why).
 */
function Protected({ role, children }: { role: Role; children: ReactNode }) {
  const { session, loading } = useSession()
  if (!isSupabaseConfigured) return <Navigate to="/login" replace />
  if (loading) return <PageFallback />
  if (!session || session.demo) return <Navigate to="/login" replace />
  if (session.role === role) return children
  return <Navigate to={ROLE_HOME[session.role]} replace />
}

/**
 * Browsers that opened the old demo still have its browser-only session saved.
 * Real logins always have a Supabase id, so anything without one is cleared.
 */
function ClearOldDemoSession() {
  const { session, signOut } = useSession()
  const stale = Boolean(session && !session.id)
  useEffect(() => {
    if (stale) void signOut()
  }, [stale, signOut])
  return null
}

/** The sidebar and bottom bar for one area, filled in with the signed-in person. */
function AreaFrame({ role, nav }: { role: Role; nav: AreaNavItem[] }) {
  const { user } = useSession()
  const { cls } = useClassData()
  const person = { name: user.name, initials: initialsOf(user.name), tone: ROLE_TONE[role], title: ROLE_TITLE[role] }
  return <AreaShell role={role} person={person} nav={nav} classLabel={cls?.name ?? ''} />
}

function Area({ role, nav }: { role: Role; nav: AreaNavItem[] }) {
  const { user } = useSession()
  return (
    <Protected role={role}>
      {/* The key starts a fresh load whenever a different person opens this area. */}
      <ClassDataProvider key={user.id ?? 'none'} role={role}>
        <AreaFrame role={role} nav={nav} />
      </ClassDataProvider>
    </Protected>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <ClearOldDemoSession />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/design" element={<DesignSystem />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/teacher" element={<Area role="teacher" nav={TEACHER_NAV} />}>
          <Route index element={<TeacherHome />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="quizzes" element={<TeacherQuizzes />} />
          <Route path="reports" element={<TeacherReports />} />
          <Route path="reports/:quizId" element={<TeacherReport />} />
          <Route path="class" element={<TeacherClass />} />
        </Route>

        <Route path="/student" element={<Area role="student" nav={STUDENT_NAV} />}>
          <Route index element={<StudentHome />} />
          <Route path="quiz/:quizId" element={<StudentQuiz />} />
          <Route path="quizzes" element={<StudentQuizzes />} />
          <Route path="gaps" element={<StudentGaps />} />
          <Route path="retry" element={<StudentRetry />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="check/:day" element={<StudentCheck />} />
        </Route>

        <Route path="/parent" element={<Area role="parent" nav={PARENT_NAV} />}>
          <Route index element={<AreaPlaceholder isHome title="Home" icon="home" home="/parent" about="How your child’s week went, what they’re working on, and one thing to ask them tonight." />} />
          <Route path="progress" element={<AreaPlaceholder title="Progress" icon="trending_up" home="/parent" about="How each topic is going over time, and recent quizzes in plain words." />} />
          <Route path="messages" element={<AreaPlaceholder title="Messages" icon="forum" home="/parent" about="Notes from your child’s teacher, and a place to reply." />} />
          <Route path="settings" element={<AreaPlaceholder title="Settings" icon="settings" home="/parent" about="Your language, and a way to link another child with an invite code." />} />
        </Route>

        {/* The old /app workspace is gone. */}
        <Route path="/app/*" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
