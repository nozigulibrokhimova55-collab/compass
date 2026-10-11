import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AreaShell, type AreaNavItem } from './components/area/AreaShell'
import DesignSystem from './pages/DesignSystem'
import GetStarted from './pages/GetStarted'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { PARENT, STUDENTS, TEACHER } from './lib/sample'

const TeacherOverview = lazy(() => import('./pages/teacher/Overview'))
const TeacherAttendance = lazy(() => import('./pages/teacher/Attendance'))
const TeacherQuizzes = lazy(() => import('./pages/teacher/Quizzes'))
const ComingSoon = lazy(() => import('./pages/ComingSoon'))

const TEACHER_NAV: AreaNavItem[] = [
  { to: '/teacher', label: 'Overview', icon: 'space_dashboard', end: true },
  { to: '/teacher/attendance', label: 'Attendance', icon: 'how_to_reg' },
  { to: '/teacher/quizzes', label: 'Quizzes', icon: 'quiz' },
]

const minji = STUDENTS[0]

function PageFallback() {
  return <p className="pt-24 text-center font-inter text-[15px] text-navy">Loading…</p>
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

        <Route path="/teacher" element={<AreaShell role="teacher" person={{ name: TEACHER.name, initials: TEACHER.initials, tone: 'orange', title: 'Teacher' }} nav={TEACHER_NAV} />}>
          <Route index element={<TeacherOverview />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="quizzes" element={<TeacherQuizzes />} />
        </Route>
        <Route path="/student" element={<AreaShell role="student" person={{ name: minji.name, initials: minji.initials, title: 'Student' }} nav={[]} />}>
          <Route index element={<ComingSoon view="student" />} />
        </Route>
        <Route path="/parent" element={<AreaShell role="parent" person={{ name: PARENT.name, initials: PARENT.initials, tone: 'beige', title: 'Minji’s parent' }} nav={[]} />}>
          <Route index element={<ComingSoon view="parent" />} />
        </Route>

        {/* The old /app workspace is retired; keep its links working. */}
        <Route path="/app/*" element={<Navigate to="/teacher" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
