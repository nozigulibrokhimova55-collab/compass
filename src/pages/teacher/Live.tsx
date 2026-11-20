import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BlockTitle } from '../../components/area/AreaBits'
import { useClassGate } from '../../components/area/classGate'
import { Icon } from '../../components/Icon'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Frame } from '../../components/ui/Frame'
import { PageNotice } from '../../components/ui/PageNotice'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useClassData } from '../../lib/classData'
import { errorMessage } from '../../lib/db'
import { startLiveSession, type LiveSession } from '../../lib/liveDb'
import { useLiveSessions } from '../../lib/useLive'
import { Loading } from '../../components/area/AreaBits'

const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** Teacher: start a live quiz from a published quiz or from scratch, jump back into the one that's running, and see past ones. */
export default function TeacherLive() {
  const gate = useClassGate()
  const { cls } = useClassData()
  return gate ?? (cls ? <LiveList classId={cls.id} /> : null)
}

function LiveList({ classId }: { classId: string }) {
  const { quizzes, students } = useClassData()
  const navigate = useNavigate()
  const sessions = useLiveSessions(classId)
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const start = async (quizId: string | null) => {
    setStarting(quizId ?? 'empty')
    setError(null)
    try {
      const id = await startLiveSession(classId, quizId)
      navigate(`/teacher/live/${id}`)
    } catch (err) {
      console.error('Could not start the live quiz', err)
      setError(errorMessage(err, 'We couldn’t start the live quiz. Try again.'))
      setStarting(null)
    }
  }

  if (sessions.loading) return <Loading />
  if (!sessions.data) {
    return (
      <PageNotice label="error.frame" title="We couldn’t load live quizzes" alert>
        {sessions.error}
      </PageNotice>
    )
  }

  const running = sessions.data.find((s) => s.status !== 'ended')
  const past = sessions.data.filter((s) => s.status === 'ended')

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="everyone at once" title="Live quiz" />

      {running ? (
        <Frame label="live_now.frame" className="mt-10 max-w-2xl" bodyClassName="flex flex-col items-start gap-4 p-6 md:p-8">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#FBE1D8] px-3 py-1 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9C3412]">
            <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-accent-strong" />
            Running now
          </p>
          <h2 className="font-grotesk text-[26px] font-extrabold leading-tight tracking-[-0.01em]">{running.title}</h2>
          <p className="font-inter text-[16px] leading-7 text-navy-soft">Started {when(running.createdAt)}. Your students can join from their Compass home page.</p>
          <Button to={`/teacher/live/${running.id}`} variant="orange" icon="arrow_forward">
            Open the host screen
          </Button>
        </Frame>
      ) : (
        <div className="mt-10 grid max-w-2xl gap-6">
          {students.length === 0 && (
            <p className="rounded-2xl bg-note px-4 py-3 font-inter text-[15px] leading-6 text-[#6B3F0E]">No students have joined your class yet, so nobody could answer. Share your class code from the Class page first.</p>
          )}
          {quizzes.length === 0 ? (
            <EmptyState label="start.frame" icon="sensors" title="Start from scratch" action={{ label: starting === 'empty' ? 'Starting…' : 'Start with quick questions', onClick: () => void start(null), icon: 'bolt' }}>
              You don’t have a published quiz yet. You can still go live: start an empty room and type your questions as you go. Or make a quiz first and run it live later.
            </EmptyState>
          ) : (
            <Frame label="start.frame" bodyClassName="p-6 md:p-8">
              <h2 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">Run a quiz live</h2>
              <p className="mt-2 font-inter text-[16px] leading-7 text-navy-soft">Pick one of your quizzes. You move through it question by question and your students answer on their phones.</p>
              <ul className="mt-4 divide-y divide-card-line">
                {quizzes.map((q) => (
                  <li key={q.id} className="flex min-h-[64px] items-center gap-3 py-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#FBE1D8] text-accent-strong">
                      <Icon name="quiz" className="text-[24px]" />
                    </span>
                    <span className="min-w-0 flex-1 font-inter text-[16px] font-semibold leading-6">{q.title}</span>
                    <Button variant="navy" icon={starting === q.id ? undefined : 'sensors'} disabled={starting !== null} onClick={() => void start(q.id)}>
                      {starting === q.id ? 'Starting…' : 'Go live'}
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t border-card-line pt-5">
                <Button variant="outline" icon="bolt" disabled={starting !== null} onClick={() => void start(null)}>
                  {starting === 'empty' ? 'Starting…' : 'Start with quick questions instead'}
                </Button>
              </div>
            </Frame>
          )}
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#FBE1D8] px-4 py-3 font-inter text-[15px] leading-6 text-[#9C3412]">
              <Icon name="error" className="mt-0.5 text-[20px]" />
              {error}
            </p>
          )}
        </div>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-live" className="mt-12 max-w-2xl">
          <BlockTitle id="past-live">{`Past live quizzes · ${past.length}`}</BlockTitle>
          <Frame label="past.frame" className="mt-4" bodyClassName="px-5 py-2 md:px-6">
            <ul className="divide-y divide-card-line">
              {past.map((s) => (
                <PastRow key={s.id} session={s} />
              ))}
            </ul>
          </Frame>
        </section>
      )}
    </>
  )
}

function PastRow({ session }: { session: LiveSession }) {
  return (
    <li className="flex min-h-[64px] items-center gap-3 py-3">
      <span className="min-w-0 flex-1 font-inter text-[16px] font-semibold leading-6">
        {session.title}
        <span className="block text-[14px] font-normal text-navy-soft">{when(session.createdAt)}</span>
      </span>
      <Button to={`/teacher/live/${session.id}`} variant="outline" icon="arrow_forward">
        Results
      </Button>
    </li>
  )
}
