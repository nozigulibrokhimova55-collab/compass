import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui/Button'
import { Frame } from '../../components/ui/Frame'
import { PageNotice } from '../../components/ui/PageNotice'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { longDay } from '../../lib/attendance'
import { useClassData } from '../../lib/classData'
import type { StudentQuiz } from '../../lib/db'
import { useSession } from '../../lib/session'

function QuizRow({ quiz }: { quiz: StudentQuiz }) {
  const detail = quiz.finished ? `${quiz.score} of ${quiz.questionCount} right` : quiz.dueDate ? `Due ${longDay(quiz.dueDate)}` : 'Ready when you are'
  return (
    <li>
      <Link to={`/student/quiz/${quiz.id}`} className="group flex min-h-16 items-center gap-3 py-3">
        <Icon name={quiz.finished ? 'task_alt' : 'quiz'} className={`text-[26px] ${quiz.finished ? 'text-navy-soft' : 'text-select'}`} />
        <span className="flex-1 font-inter text-[16px]">
          {quiz.title}
          <span className="block font-inter text-[14px] text-navy-soft">
            {detail} · {quiz.questionCount} {quiz.questionCount === 1 ? 'question' : 'questions'}
          </span>
        </span>
        <span className="rounded-full border-[1.5px] border-navy px-3 py-0.5 font-inter text-[14px] font-medium">{quiz.finished ? 'Review' : 'Start'}</span>
      </Link>
    </li>
  )
}

/** The student's home: their quizzes, and the invite code a parent uses to link up. */
export default function StudentHome() {
  const { isDemo, user } = useSession()
  const notify = useToast()
  const { loading, error, cls, studentQuizzes } = useClassData()
  const inviteCode = !isDemo ? user.inviteCode : null

  if (loading) return <p className="pt-24 text-center font-inter text-[15px] text-navy">Loading…</p>
  if (error) {
    return (
      <PageNotice label="error.frame" title="We couldn’t load your class" alert>
        {error}
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

  const todo = studentQuizzes.filter((q) => !q.finished)
  const done = studentQuizzes.filter((q) => q.finished)

  const copyInvite = async () => {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      notify('Invite code copied.', 'content_copy')
    } catch {
      notify('Couldn’t copy. Select the code and copy it by hand.', 'info')
    }
  }

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="your quizzes" title={`Hi, ${isDemo ? 'Minji' : user.name}`} />
      <p className="mt-4 font-inter text-[17px] text-navy-soft">You’re in {cls.name}.</p>

      <Frame label="todo.frame" className="mt-10 max-w-2xl" bodyClassName="p-6 md:p-8">
        <h2 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">To do</h2>
        {todo.length === 0 ? (
          <p className="mt-2 font-inter text-[16px] leading-7 text-navy-soft">
            {studentQuizzes.length === 0 ? 'No quizzes yet. When your teacher shares one, it shows up here.' : 'You’re all caught up.'}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-card-line">
            {todo.map((q) => (
              <QuizRow key={q.id} quiz={q} />
            ))}
          </ul>
        )}
      </Frame>

      {done.length > 0 && (
        <Frame label="done.frame" className="mt-8 max-w-2xl" bodyClassName="p-6 md:p-8">
          <h2 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">Finished</h2>
          <ul className="mt-2 divide-y divide-card-line">
            {done.map((q) => (
              <QuizRow key={q.id} quiz={q} />
            ))}
          </ul>
        </Frame>
      )}

      {inviteCode && (
        <Frame label="invite.frame" className="mt-8 max-w-2xl" bodyClassName="p-6 md:p-8">
          <h2 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">Your invite code</h2>
          <p className="mt-2 font-inter text-[16px] leading-7 text-navy-soft">A parent or guardian types this when they sign up, and they can then follow how you’re doing.</p>
          <p className="mt-4 font-mono text-[24px] font-semibold tracking-[0.08em] text-navy">{inviteCode}</p>
          <div className="mt-5">
            <Button variant="outline" icon="content_copy" onClick={copyInvite}>
              Copy code
            </Button>
          </div>
        </Frame>
      )}
    </>
  )
}
