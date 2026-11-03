import { SampleTag } from '../../components/area/AreaBits'
import { Bento, BentoItem } from '../../components/area/Bento'
import { plural, useClassGate } from '../../components/area/classGate'
import { FamilyCard } from '../../components/student/FamilyCard'
import { dueText } from '../../components/student/format'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatCard } from '../../components/ui/StatCard'
import { StickyNote } from '../../components/ui/StickyNote'
import { useClassData } from '../../lib/classData'
import { useTopicProgress } from '../../lib/sampleData'
import { useSession } from '../../lib/session'
import { useMistakes } from '../../lib/useMistakes'
import { useMyAttendance } from '../../lib/useMyAttendance'
import { useToday } from '../../lib/useToday'

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

/** Student Home: next quiz, retries due, what's getting better, attendance this month, and the family note. */
export default function StudentHome() {
  const gate = useClassGate({ student: true })
  return gate ?? <HomeBody />
}

function HomeBody() {
  const { user } = useSession()
  const { cls, studentQuizzes, reload } = useClassData()
  const now = useToday()
  const month = useMyAttendance(now.getFullYear(), now.getMonth())
  const retries = useMistakes()
  const { improving } = useTopicProgress()
  const monthName = now.toLocaleDateString('en-US', { month: 'long' })

  const next = studentQuizzes.filter((q) => !q.finished).sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))[0]
  const anyFinished = studentQuizzes.some((q) => q.finished)

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="hey there" title={`Hi, ${firstName(user.name)}`} />
      {cls && <p className="mt-4 w-fit rounded-full bg-white/85 px-3 py-1 font-inter text-[15px] text-navy backdrop-blur-sm">You’re in {cls.name}</p>}

      <Bento className="mt-8">
        {/* Next quiz */}
        <BentoItem span={4}>
          {next ? (
            <Frame label="next.frame" className="h-full" bodyClassName="flex h-full flex-col p-6 md:p-7">
              <p className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-navy-soft">Next quiz</p>
              <h2 className="mt-1 font-grotesk text-[26px] font-extrabold leading-tight tracking-[-0.02em] md:text-[30px]">{next.title}</h2>
              <p className="mt-2 font-inter text-[16px] text-navy-soft">
                {dueText(next.dueDate)} · {plural(next.questionCount, 'question')}
              </p>
              <Button to={`/student/quiz/${next.id}`} variant="orange" size="lg" icon="play_arrow" className="mt-6 w-full sm:w-fit">
                Start the quiz
              </Button>
            </Frame>
          ) : (
            <EmptyState
              label="next.frame"
              icon="celebration"
              title={studentQuizzes.length === 0 ? 'No quizzes yet' : 'You’re all caught up'}
              className="h-full"
              action={anyFinished ? { label: 'Review finished quizzes', to: '/student/quizzes' } : { label: 'Check again', icon: 'refresh', onClick: () => void reload() }}
            >
              {studentQuizzes.length === 0 ? 'When your teacher shares a quiz, it shows up here.' : 'Nothing is due right now. New quizzes show up here.'}
            </EmptyState>
          )}
        </BentoItem>

        {/* Retries due */}
        <BentoItem span={2}>
          <Frame label="retry.frame" className="h-full" bodyClassName="flex h-full flex-col p-6">
            <p className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-navy-soft">Retry</p>
            {retries.loading ? (
              <p className="mt-2 font-inter text-[16px] text-navy-soft">Loading…</p>
            ) : retries.due.length > 0 ? (
              <>
                <p className="mt-1 font-grotesk text-[44px] font-black leading-none tracking-[-0.04em]">
                  {retries.due.length}
                  <span className="text-accent"> due</span>
                </p>
                <p className="mt-2 font-inter text-[15px] leading-6 text-navy-soft">Questions you missed before, back for another try.</p>
                <Button to="/student/retry" variant="navy" icon="replay" className="mt-auto w-full">
                  Start retry
                </Button>
              </>
            ) : (
              <p className="mt-2 font-inter text-[16px] leading-7 text-navy-soft">
                {retries.upcoming.length > 0 ? `Nothing due today. ${plural(retries.upcoming.length, 'question')} will come back soon.` : 'Nothing to retry. Missed questions come back here after 2 days.'}
              </p>
            )}
          </Frame>
        </BentoItem>

        {/* Getting better at */}
        <BentoItem span={2}>
          <div className="relative flex h-full items-center justify-center py-4">
            <StickyNote tilt={-2} className="w-full max-w-none">
              <span className="block font-hand text-[24px] font-bold leading-7">You’re getting better at</span>
              <span className="mt-1 block font-grotesk text-[22px] font-extrabold leading-tight">{improving.name}</span>
              <span className="mt-2 block text-[14px]">Up a lot since four weeks ago. Keep it going.</span>
              <SampleTag className="mt-3" />
            </StickyNote>
          </div>
        </BentoItem>

        {/* Attendance this month */}
        <BentoItem span={2}>
          <StatCard
            className="h-full"
            title={`${monthName} · attendance`}
            stats={
              month.loading || month.error || month.counts.days === 0
                ? [
                    { value: '–', label: 'Here' },
                    { value: '–', label: 'Missed' },
                  ]
                : [
                    { value: String(month.counts.present + month.counts.late), symbol: `/${month.counts.days}`, label: 'Here' },
                    { value: String(month.counts.absent), label: 'Missed' },
                  ]
            }
            note={month.error ?? (month.counts.days === 0 && !month.loading ? 'Nothing marked yet this month.' : month.counts.absent > 0 ? 'Missed a day? There’s a short catch-up check for it.' : undefined)}
          />
        </BentoItem>

        {/* Family note */}
        <BentoItem span={2}>
          <FamilyCard />
        </BentoItem>
      </Bento>

      {month.counts.absent > 0 && (
        <div className="mt-8">
          <Button to="/student/attendance" variant="outline" icon="arrow_forward">
            See catch-up checks
          </Button>
        </div>
      )}
    </>
  )
}
