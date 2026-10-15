import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { Accordion } from '../../components/ui/Accordion'
import { Button } from '../../components/ui/Button'
import { Frame } from '../../components/ui/Frame'
import { PageNotice } from '../../components/ui/PageNotice'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatCard } from '../../components/ui/StatCard'
import { StatementCard } from '../../components/ui/StatementCard'
import { Avatar } from '../../components/ui/ThreadCard'
import { attendanceStats as classAttendanceStats, longDay } from '../../lib/attendance'
import { useClassData, type ClassStudent } from '../../lib/classData'
import { errorMessage, fetchQuizResults, type QuizSummary } from '../../lib/db'
import { attendanceStats, LESSON_IDEAS, MISCONCEPTION, QUIZ3_SCORES, QUIZZES, STUDENTS, TEACHER, TODAY } from '../../lib/sample'
import { useSession } from '../../lib/session'
import { useAttendance } from '../../lib/useAttendance'

/** Small mono heading between blocks. */
export function BlockTitle({ children, id }: { children: string; id?: string }) {
  return (
    <h2 id={id} className="w-fit scroll-mt-24 rounded-full bg-white/85 px-3 py-1 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-navy backdrop-blur-sm">
      {children}
    </h2>
  )
}

/** The sample class (Ms. Park's Physics 1) is the demo. A real account gets its own, empty-at-first class. */
export default function TeacherOverview() {
  const { isDemo } = useClassData()
  return isDemo ? <DemoOverview /> : <LiveOverview />
}

type Scores = { rows: { student: ClassStudent; right: number; total: number }[]; error: string | null } | null

/** Real scores for the latest quiz. Only students who finished show up (a quiz is saved all at once). */
function LiveScores({ quiz, students }: { quiz: QuizSummary; students: ClassStudent[] }) {
  const [scores, setScores] = useState<Scores>(null)

  useEffect(() => {
    let live = true
    fetchQuizResults(quiz.id)
      .then((marks) => {
        const rows = students
          .map((student) => {
            const mine = marks.filter((m) => m.studentId === student.id)
            return { student, right: mine.filter((m) => m.correct).length, total: mine.length }
          })
          .filter((r) => r.total > 0)
        if (live) setScores({ rows, error: null })
      })
      .catch((err) => {
        console.error('Could not load quiz scores', err)
        if (live) setScores({ rows: [], error: errorMessage(err, 'We couldn’t load the scores.') })
      })
    return () => {
      live = false
    }
  }, [quiz.id, students])

  const rows = scores?.rows ?? []
  const average = rows.length ? rows.reduce((sum, r) => sum + r.right / r.total, 0) / rows.length : 0

  return (
    <section aria-labelledby="scores" className="mt-16">
      <BlockTitle id="scores">{`${quiz.title} scores`}</BlockTitle>
      <Frame label="scores.frame" className="mt-6">
        {!scores ? (
          <p className="font-inter text-[16px] text-navy-soft">Loading…</p>
        ) : scores.error ? (
          <p role="alert" className="font-inter text-[16px]">
            {scores.error}
          </p>
        ) : rows.length === 0 ? (
          <p className="font-inter text-[16px] leading-7 text-navy-soft">No one has finished this quiz yet. Scores show up here as students finish.</p>
        ) : (
          <>
            <p className="font-inter text-[16px]">
              Class average <span className="font-semibold">{Math.round(average * 100)}%</span> · {rows.length} of {students.length} finished
            </p>
            <ul className="mt-4 grid gap-x-10 gap-y-3 sm:grid-cols-2">
              {rows.map((r) => (
                <li key={r.student.id} className="flex items-center gap-3 font-inter text-[16px]">
                  <Avatar person={{ name: r.student.name, initials: r.student.initials }} size="sm" />
                  <span className="flex-1">{r.student.name}</span>
                  <span className="font-mono text-[15px] font-semibold">
                    {r.right}/{r.total}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Frame>
    </section>
  )
}

/** Real class from Supabase: the class code, roster, attendance so far, and the latest quiz. */
function LiveOverview() {
  const { user } = useSession()
  const notify = useToast()
  const { loading, error, cls, students, quizzes } = useClassData()
  const att = useAttendance()

  if (loading || att.loading) return <p className="pt-24 text-center font-inter text-[15px] text-navy">Loading…</p>
  if (error || att.error) {
    return (
      <PageNotice label="error.frame" title="We couldn’t load your class" alert>
        {error ?? att.error}
      </PageNotice>
    )
  }
  if (!cls) {
    return (
      <PageNotice label="class.frame" title="No class yet">
        We couldn’t find a class for your account.
      </PageNotice>
    )
  }

  const week = classAttendanceStats(att.history, students.map((s) => s.id))
  const noData = week.days === 0
  const latestQuiz = quizzes[0]
  const count = `${students.length} ${students.length === 1 ? 'student' : 'students'}`

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(cls.code)
      notify('Class code copied.', 'content_copy')
    } catch {
      notify('Couldn’t copy. Select the code and copy it by hand.', 'info')
    }
  }

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="good to see you" title={`Hi, ${user.name}`} />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <StatementCard as="h2" title="Students join your class with" highlight={cls.code} footer={[cls.name, count]}>
          <p>Give this code to your students. They type it when they sign up, and they land in your class.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="orange" icon="content_copy" onClick={copyCode}>
              Copy code
            </Button>
            <Button to="/teacher/attendance" variant="outline">
              Take attendance
            </Button>
          </div>
        </StatementCard>

        <div className="flex flex-col gap-6">
          <StatCard
            title="Last 5 school days · attendance"
            stats={
              noData
                ? [
                    { value: '–', label: 'Here' },
                    { value: '–', label: 'Absences' },
                    { value: '–', label: 'Late' },
                  ]
                : [
                    { value: String(week.rate), symbol: '%', label: 'Here' },
                    { value: String(week.absent), label: 'Absences' },
                    { value: String(week.late), label: 'Late' },
                  ]
            }
            note={noData ? 'Nothing saved yet. Take attendance to start.' : undefined}
          />
          <Frame label="today.frame" tabEnd={<span className="rounded-full bg-white/85 px-2.5 py-0.5 font-mono text-[12px] text-navy">{att.todayLabel}</span>}>
            <h2 className="font-grotesk text-[20px] font-extrabold tracking-[-0.01em]">To do today</h2>
            <ul className="mt-3 divide-y divide-card-line">
              <li>
                <Link to="/teacher/attendance" className="group flex min-h-14 items-center gap-3 py-2">
                  <Icon name="how_to_reg" className="text-[24px] text-select" />
                  <span className="flex-1 font-inter text-[16px]">Take attendance</span>
                  <Icon name="arrow_forward" className="text-[20px] text-navy-soft transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
              <li>
                <Link to="/teacher/quizzes" className="group flex min-h-14 items-center gap-3 py-2">
                  <Icon name="quiz" className="text-[24px] text-select" />
                  <span className="flex-1 font-inter text-[16px]">
                    {latestQuiz ? latestQuiz.title : 'Make your first quiz'}
                    <span className="block font-inter text-[14px] text-navy-soft">
                      {latestQuiz ? (latestQuiz.dueDate ? `Due ${longDay(latestQuiz.dueDate)}` : 'Latest quiz') : 'Start from your lesson notes'}
                    </span>
                  </span>
                  <Icon name="arrow_forward" className="text-[20px] text-navy-soft transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            </ul>
          </Frame>
        </div>
      </div>

      <section aria-labelledby="roster" className="mt-16">
        <BlockTitle id="roster">Your students</BlockTitle>
        <Frame label="roster.frame" className="mt-6">
          {students.length === 0 ? (
            <p className="font-inter text-[16px] leading-7 text-navy-soft">
              No students yet. They show up here after they sign up with <span className="font-mono font-semibold text-navy">{cls.code}</span>.
            </p>
          ) : (
            <ul className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
              {students.map((s) => (
                <li key={s.id} className="flex items-center gap-3 font-inter text-[16px]">
                  <Avatar person={{ name: s.name, initials: s.initials }} size="sm" />
                  {s.name}
                </li>
              ))}
            </ul>
          )}
        </Frame>
      </section>

      {latestQuiz && <LiveScores key={latestQuiz.id} quiz={latestQuiz} students={students} />}

      <section aria-labelledby="misconceptions" className="mt-16">
        <BlockTitle id="misconceptions">Misconceptions</BlockTitle>
        <Frame label="misconceptions.frame" className="mt-6">
          <p className="font-inter text-[16px] leading-7 text-navy-soft">Nothing here yet. Once students take quizzes, the idea most of them got wrong will show up here.</p>
          <div className="mt-5">
            <Button to="/teacher/quizzes" variant="navy" icon="arrow_forward">
              Make a quiz
            </Button>
          </div>
        </Frame>
      </section>
    </>
  )
}

function DemoOverview() {
  const week = attendanceStats()
  const affected = STUDENTS.filter((s) => MISCONCEPTION.students.includes(s.id))
  const share = affected.length / STUDENTS.length
  const scores = STUDENTS.map((s) => ({ ...s, score: QUIZ3_SCORES[s.id] }))
  const average = Math.round((scores.reduce((sum, s) => sum + s.score, 0) / (scores.length * 6)) * 100)
  const nextQuiz = QUIZZES.find((q) => !q.done)

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="good morning" title={`Hi, ${TEACHER.name}`} />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <StatementCard
          as="h2"
          title={`${affected.length} of ${STUDENTS.length} students think`}
          highlight={MISCONCEPTION.idea}
          footer={[MISCONCEPTION.quiz, `Questions ${MISCONCEPTION.questions.join(' and ')}`]}
        >
          <p>{MISCONCEPTION.detail}</p>
          <div className="mt-5">
            <div className="h-3 overflow-hidden rounded-full bg-[#EEF4FB]" role="img" aria-label={`${Math.round(share * 100)} percent of the class`}>
              <div className="h-full rounded-full bg-accent-strong" style={{ width: `${share * 100}%` }} />
            </div>
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Students with this idea">
              {affected.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-full border border-card-line bg-white py-1 pl-1 pr-3 font-inter text-[14px] text-navy">
                  <Avatar person={{ name: s.name, initials: s.initials }} size="sm" />
                  {s.name}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button to={`/teacher/quizzes?topic=${MISCONCEPTION.topicId}`} variant="orange" icon="replay">
              Make a retry quiz
            </Button>
            <Button href="#ideas" variant="outline">
              Ideas for next class
            </Button>
          </div>
        </StatementCard>

        <div className="flex flex-col gap-6">
          <StatCard
            title="Last week · attendance"
            stats={[
              { value: String(week.rate), symbol: '%', label: 'Here' },
              { value: String(week.absent), label: 'Absences' },
              { value: String(week.late), label: 'Late' },
            ]}
          />
          <Frame label="today.frame" tabEnd={<span className="rounded-full bg-white/85 px-2.5 py-0.5 font-mono text-[12px] text-navy">{TODAY.label}</span>}>
            <h2 className="font-grotesk text-[20px] font-extrabold tracking-[-0.01em]">To do today</h2>
            <ul className="mt-3 divide-y divide-card-line">
              <li>
                <Link to="/teacher/attendance" className="group flex min-h-14 items-center gap-3 py-2">
                  <Icon name="how_to_reg" className="text-[24px] text-select" />
                  <span className="flex-1 font-inter text-[16px]">Take attendance</span>
                  <Icon name="arrow_forward" className="text-[20px] text-navy-soft transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
              {nextQuiz && (
                <li>
                  <Link to="/teacher/quizzes" className="group flex min-h-14 items-center gap-3 py-2">
                    <Icon name="quiz" className="text-[24px] text-select" />
                    <span className="flex-1 font-inter text-[16px]">
                      {nextQuiz.title}
                      <span className="block font-inter text-[14px] text-navy-soft">Due {nextQuiz.due}</span>
                    </span>
                    <Icon name="arrow_forward" className="text-[20px] text-navy-soft transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              )}
            </ul>
          </Frame>
        </div>
      </div>

      <section aria-labelledby="ideas" className="mt-16 scroll-mt-24">
        <BlockTitle id="ideas">Ideas for next class</BlockTitle>
        <Accordion
          className="mt-6"
          items={LESSON_IDEAS.map((idea, i) => ({
            tab: `idea_0${i + 1}.frame`,
            title: idea.title,
            body: (
              <>
                <span className="mb-2 inline-block rounded-full bg-note px-2.5 py-0.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6B3F0E]">{idea.time}</span>
                <p>{idea.text}</p>
              </>
            ),
          }))}
        />
      </section>

      <section aria-labelledby="scores" className="mt-16">
        <BlockTitle id="scores">Quiz 3 scores</BlockTitle>
        <Frame label="quiz_3.frame" className="mt-6" tabEnd={<span className="rounded-full bg-white/85 px-2.5 py-0.5 font-mono text-[12px] text-navy">Class average {average}%</span>}>
          <ul className="grid gap-x-10 gap-y-4 md:grid-cols-2">
            {scores.map((s) => (
              <li key={s.id}>
                <div className="flex items-baseline justify-between font-inter text-[15px]">
                  <span className="font-semibold">{s.name}</span>
                  <span className="font-mono text-[13px] text-navy-soft">{s.score} / 6</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#EEF4FB]">
                  <div className="h-full rounded-full bg-navy" style={{ width: `${(s.score / 6) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Frame>
      </section>
    </>
  )
}
