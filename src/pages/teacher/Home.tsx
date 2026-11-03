import { Link } from 'react-router-dom'
import { BlockTitle, SampleTag } from '../../components/area/AreaBits'
import { plural, useClassGate } from '../../components/area/classGate'
import { Bento, BentoItem } from '../../components/area/Bento'
import { Icon } from '../../components/Icon'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatCard } from '../../components/ui/StatCard'
import { StatementCard } from '../../components/ui/StatementCard'
import { attendanceStats } from '../../lib/attendance'
import { useClassData } from '../../lib/classData'
import { useDayTopic, useMisconceptions, useReviewPlans } from '../../lib/sampleData'
import { useSession } from '../../lib/session'
import { useAttendance } from '../../lib/useAttendance'

export function DatePill({ children }: { children: string }) {
  return <span className="rounded-full bg-white/85 px-2.5 py-0.5 font-mono text-[12px] text-navy">{children}</span>
}

/** Teacher Home: today's class, attendance, the latest quiz's top mix-up, and what's waiting for approval. */
export default function TeacherHome() {
  const att = useAttendance()
  const gate = useClassGate({ loading: att.loading, error: att.error })
  return gate ?? <HomeBody att={att} />
}

function HomeBody({ att }: { att: ReturnType<typeof useAttendance> }) {
  const { user } = useSession()
  const { cls, students, quizzes } = useClassData()
  const { topic } = useDayTopic(cls?.id, att.todayIso)
  const latestQuiz = quizzes[0]
  const report = useMisconceptions(latestQuiz?.id)
  const { waiting } = useReviewPlans()
  if (!cls) return null

  const week = attendanceStats(att.history, students.map((s) => s.id))
  const marked = students.filter((s) => att.todayMarks[s.id]).length
  const doneToday = students.length > 0 && marked === students.length
  const top = report.misconceptions[0]

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="good to see you" title={`Hi, ${user.name}`} />

      <Bento className="mt-10">
        {/* Today's class */}
        <BentoItem span={4}>
          <Frame label="today.frame" tabEnd={<DatePill>{att.todayLabel}</DatePill>} className="h-full" bodyClassName="flex h-full flex-col p-6 md:p-7">
            <p className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-navy-soft">Today’s class</p>
            <h2 className="mt-1 font-grotesk text-[26px] font-extrabold leading-tight tracking-[-0.02em] md:text-[30px]">{cls.name}</h2>
            <p className="mt-2 font-inter text-[16px] leading-7 text-navy-soft">
              {topic ? (
                <>
                  Topic: <span className="font-semibold text-navy">{topic}</span>
                </>
              ) : (
                'No topic yet. Add one when you take attendance, so anyone who misses class gets a catch-up card.'
              )}
            </p>

            {students.length === 0 ? (
              <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl bg-[#F3F7FC] p-4">
                <p className="font-inter text-[16px] leading-7">
                  No students yet. Share your join code <span className="font-mono font-semibold">{cls.code}</span> and they’ll show up here.
                </p>
                <Button to="/teacher/class" variant="navy" icon="arrow_forward">
                  Share the join code
                </Button>
              </div>
            ) : (
              <div className="mt-auto pt-6">
                <div className="flex items-baseline justify-between gap-3 font-inter text-[15px]">
                  <span className="font-semibold">Attendance today</span>
                  <span className="text-navy-soft">
                    {marked} of {plural(students.length, 'student')} marked
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#EEF4FB]" aria-hidden="true">
                  <div className="h-full rounded-full bg-select transition-[width] duration-500" style={{ width: `${(marked / students.length) * 100}%` }} />
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button to="/teacher/attendance" variant={doneToday ? 'outline' : 'orange'} icon={doneToday ? 'edit' : 'how_to_reg'}>
                    {doneToday ? 'Change attendance' : 'Take attendance'}
                  </Button>
                  <Button to="/teacher/quizzes" variant="outline" icon="quiz">
                    Make a quiz
                  </Button>
                </div>
              </div>
            )}
          </Frame>
        </BentoItem>

        {/* Attendance summary */}
        <BentoItem span={2}>
          <StatCard
            className="h-full"
            title="Last 5 school days"
            stats={
              week.days === 0
                ? [
                    { value: '–', label: 'Here' },
                    { value: '–', label: 'Absent' },
                  ]
                : [
                    { value: String(week.rate), symbol: '%', label: 'Here' },
                    { value: String(week.absent), label: 'Absent' },
                  ]
            }
            note={
              week.days === 0
                ? 'Nothing saved yet. Your first attendance shows up here.'
                : `${plural(week.late, 'late arrival')} over ${plural(week.days, 'day')}. Late still counts as here.`
            }
          />
        </BentoItem>

        {/* Latest quiz: top misconception */}
        <BentoItem span={4}>
          {!latestQuiz || !top ? (
            <EmptyState
              label="misconception.frame"
              icon="quiz"
              title="No quiz results yet"
              className="h-full"
              action={{ label: 'Make a quiz', to: '/teacher/quizzes', icon: 'auto_awesome' }}
            >
              Make a quiz from your lesson notes. Once students finish it, the idea most of them mixed up shows up here.
            </EmptyState>
          ) : (
            <div className="relative h-full">
              <StatementCard
                as="h2"
                className="h-full"
                title={`${top.students} of ${report.totalStudents} students think`}
                highlight={top.idea}
                footer={[report.quizTitle, `Question${top.questions.length > 1 ? 's' : ''} ${top.questions.join(' and ')}`]}
              >
                <p>{top.detail}</p>
                <p className="mt-3 font-semibold text-navy">{top.confidentWrong > 0 ? `${top.confidentWrong} of them were sure of their wrong answer.` : 'None of them were sure of their answer.'}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button to={`/teacher/reports/${latestQuiz.id}`} variant="orange" icon="arrow_forward">
                    See the report
                  </Button>
                </div>
              </StatementCard>
              <SampleTag className="absolute right-6 top-6" />
            </div>
          )}
        </BentoItem>

        {/* Waiting for approval */}
        <BentoItem span={2}>
          <Frame label="approve.frame" tabEnd={latestQuiz ? <SampleTag /> : undefined} className="h-full" bodyClassName="flex h-full flex-col p-6">
            <h2 className="font-grotesk text-[20px] font-extrabold tracking-[-0.01em]">Waiting for you</h2>
            {!latestQuiz || waiting.length === 0 ? (
              <p className="mt-3 font-inter text-[16px] leading-7 text-navy-soft">
                {latestQuiz ? 'All caught up. Nothing needs your OK right now.' : 'Nothing yet. After a quiz, Compass suggests short review plans for you to approve here.'}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-card-line">
                {waiting.map((p) => (
                  <li key={p.id}>
                    <Link to={`/teacher/reports/${latestQuiz.id}#plan-${p.id}`} className="group flex min-h-14 items-start gap-3 py-3">
                      <Icon name="pending_actions" className="mt-0.5 text-[22px] text-select" />
                      <span className="flex-1 font-inter text-[15px] leading-6">
                        <span className="font-semibold">{p.minutes}-minute review</span>
                        <span className="block text-navy-soft">Students think {p.idea}</span>
                      </span>
                      <Icon name="arrow_forward" className="mt-0.5 text-[20px] text-navy-soft transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Frame>
        </BentoItem>
      </Bento>

      {quizzes.length > 1 && (
        <section aria-labelledby="recent" className="mt-14">
          <BlockTitle id="recent">Recent quizzes</BlockTitle>
          <ul className="mt-5 flex flex-wrap gap-2">
            {quizzes.slice(0, 5).map((q) => (
              <li key={q.id}>
                <Link
                  to={`/teacher/reports/${q.id}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-navy bg-white/85 px-4 font-inter text-[15px] font-medium text-navy transition-colors hover:bg-navy hover:text-white"
                >
                  <Icon name="insights" className="text-[18px]" />
                  {q.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
