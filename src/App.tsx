import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import Auth from './pages/Auth'
import Landing from './pages/Landing'
import TeacherDashboard from './pages/TeacherDashboard'

const ParentUpdate = lazy(() => import('./pages/ParentUpdate'))
const MisconceptionRadar = lazy(() => import('./pages/MisconceptionRadar'))
const StudentReflections = lazy(() => import('./pages/StudentReflections'))
const CurriculumMap = lazy(() => import('./pages/CurriculumMap'))

function PageFallback() {
  return <div className="pt-space-xl text-center font-body-sm text-body-sm text-secondary">Loading…</div>
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="radar" element={<MisconceptionRadar />} />
          <Route path="reflections" element={<StudentReflections />} />
          <Route path="family" element={<ParentUpdate />} />
          <Route path="curriculum" element={<CurriculumMap />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
