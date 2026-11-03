import { Link } from 'react-router-dom'
import { BlockTitle } from '../../components/area/AreaBits'
import { plural, useClassGate } from '../../components/area/classGate'
import { Icon } from '../../components/Icon'
import { EmptyState } from '../../components/ui/EmptyState'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { longDay } from '../../lib/attendance'
import { useClassData, type ClassStudent } from '../../lib/classData'
import type { QuizSummary } from '../../lib/db'
import { useQuizResults } from '../../lib/useQuizResults'

export default function TeacherReports() {
  const gate = useClassGate()
  return gate ?? <ReportList />
}

function ReportList() {
  const { quizzes, students } = useClassData()

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="what they mixed up" title="Reports" />

      {quizzes.length === 0 ? (
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <EmptyState label="reports.frame" icon="insights" title="No reports yet" action={{ label: 'Make a quiz', to: '/teacher/quizzes', icon: 'auto_awesome' }}>
            Each quiz gets a report once students finish it: the most common mix-ups, the answers behind them, and a short review plan for next class.
          </EmptyState>
          <Frame label="sample.frame" bodyClassName="flex h-full flex-col items-start gap-3 p-6 md:p-8">
            <h2 className="font-grotesk text-[20px] font-extrabold tracking-[-0.01em]">Curious what one looks like?</h2>
            <p className="font-inter text-[16px] leading-7 text-navy-soft">Open a sample report from Ms. Park’s physics class.</p>
            <Link to="/teacher/reports/sample" className="mt-auto inline-flex min-h-11 items-center gap-1.5 font-inter text-[15px] font-semibold text-accent-strong underline-offset-4 hover:underline">
              See the sample report
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          </Frame>
        </div>
      ) : (
        <section aria-labelledby="quiz-list" className="mt-10">
          <BlockTitle id="quiz-list">{`Your quizzes · ${quizzes.length}`}</BlockTitle>
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {quizzes.map((q, i) => (
              <li key={q.id}>
                <QuizCard quiz={q} number={quizzes.length - i} students={students} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

/** `number` counts from the oldest quiz (quiz_01), since the list shows the newest first. */
function QuizCard({ quiz, number, students }: { quiz: QuizSummary; number: number; students: ClassStudent[] }) {
  const results = useQuizResults(quiz.id, students)
  const finished = results.loading ? 'Loading…' : results.error ? 'Couldn’t load scores' : `${results.finished} of ${plural(students.length, 'student')} finished`

  return (
    <Frame label={`quiz_${String(number).padStart(2, '0')}.frame`} className="h-full" bodyClassName="flex h-full flex-col gap-3 p-6">
      <h2 className="font-grotesk text-[22px] font-extrabold leading-tight tracking-[-0.01em]">{quiz.title}</h2>
      <p className="font-inter text-[15px] text-navy-soft">
        {quiz.dueDate ? `Due ${longDay(quiz.dueDate)}` : 'No due date'} · {finished}
      </p>
      {results.average !== null && (
        <p className="font-inter text-[15px]">
          Class average <span className="font-semibold">{results.average}%</span>
        </p>
      )}
      <Link
        to={`/teacher/reports/${quiz.id}`}
        className="mt-auto inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl bg-navy px-4 font-inter text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong"
      >
        Open report
        <Icon name="arrow_forward" className="text-[18px]" />
      </Link>
    </Frame>
  )
}
