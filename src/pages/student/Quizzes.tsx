import { Link } from 'react-router-dom'
import { BlockTitle } from '../../components/area/AreaBits'
import { useClassGate } from '../../components/area/classGate'
import { Icon } from '../../components/Icon'
import { EmptyState } from '../../components/ui/EmptyState'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { dueText } from '../../components/student/format'
import { isoDate } from '../../lib/attendance'
import { useClassData } from '../../lib/classData'
import { useToday } from '../../lib/useToday'
import type { StudentQuiz } from '../../lib/db'

export function QuizRow({ quiz }: { quiz: StudentQuiz }) {
  const today = isoDate(useToday())
  const overdue = !quiz.finished && quiz.dueDate !== null && quiz.dueDate < today
  return (
    <li>
      <Link to={`/student/quiz/${quiz.id}`} className="group flex min-h-[72px] items-center gap-3 py-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${quiz.finished ? 'bg-[#E3F5EA] text-[#1F5C35]' : 'bg-[#FBE1D8] text-accent-strong'}`}>
          <Icon name={quiz.finished ? 'task_alt' : 'quiz'} className="text-[24px]" />
        </span>
        <span className="min-w-0 flex-1 font-inter text-[16px] font-semibold leading-6">
          {quiz.title}
          <span className={`block text-[14px] font-normal ${overdue ? 'font-semibold text-accent-strong' : 'text-navy-soft'}`}>
            {quiz.finished ? `${quiz.score} of ${quiz.questionCount} right` : dueText(quiz.dueDate)} · {quiz.questionCount} {quiz.questionCount === 1 ? 'question' : 'questions'}
          </span>
        </span>
        <span className="shrink-0 rounded-full border-[1.5px] border-navy px-3 py-1 font-inter text-[14px] font-semibold transition-colors group-hover:bg-navy group-hover:text-white">
          {quiz.finished ? 'Review' : 'Start'}
        </span>
      </Link>
    </li>
  )
}

export default function StudentQuizzes() {
  const gate = useClassGate({ student: true })
  return gate ?? <QuizList />
}

function QuizList() {
  const { studentQuizzes, reload } = useClassData()
  const todo = studentQuizzes.filter((q) => !q.finished).sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
  const done = studentQuizzes.filter((q) => q.finished)

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="one at a time" title="Quizzes" />

      {studentQuizzes.length === 0 ? (
        <EmptyState label="quizzes.frame" icon="quiz" title="No quizzes yet" className="mt-10 max-w-xl" action={{ label: 'Check again', icon: 'refresh', onClick: () => void reload() }}>
          When your teacher shares a quiz, it shows up here with its due date.
        </EmptyState>
      ) : (
        <div className="mt-10 grid max-w-2xl gap-10">
          <section aria-labelledby="todo">
            <BlockTitle id="todo">{`To do · ${todo.length}`}</BlockTitle>
            <Frame label="todo.frame" className="mt-4" bodyClassName="px-5 py-2 md:px-6">
              {todo.length === 0 ? (
                <p className="py-4 font-inter text-[16px] leading-7 text-navy-soft">You’re all caught up. New quizzes show up here.</p>
              ) : (
                <ul className="divide-y divide-card-line">
                  {todo.map((q) => (
                    <QuizRow key={q.id} quiz={q} />
                  ))}
                </ul>
              )}
            </Frame>
          </section>

          {done.length > 0 && (
            <section aria-labelledby="done">
              <BlockTitle id="done">{`Finished · ${done.length}`}</BlockTitle>
              <Frame label="done.frame" className="mt-4" bodyClassName="px-5 py-2 md:px-6">
                <ul className="divide-y divide-card-line">
                  {done.map((q) => (
                    <QuizRow key={q.id} quiz={q} />
                  ))}
                </ul>
              </Frame>
            </section>
          )}
        </div>
      )}
    </>
  )
}
