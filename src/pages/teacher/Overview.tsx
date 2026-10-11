import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Accordion } from '../../components/ui/Accordion'
import { Button } from '../../components/ui/Button'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatCard } from '../../components/ui/StatCard'
import { StatementCard } from '../../components/ui/StatementCard'
import { Avatar } from '../../components/ui/ThreadCard'
import { attendanceStats, LESSON_IDEAS, MISCONCEPTION, QUIZ3_SCORES, QUIZZES, STUDENTS, TEACHER, TODAY } from '../../lib/sample'

/** Small mono heading between blocks. */
export function BlockTitle({ children, id }: { children: string; id?: string }) {
  return (
    <h2 id={id} className="w-fit scroll-mt-24 rounded-full bg-white/85 px-3 py-1 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-navy backdrop-blur-sm">
      {children}
    </h2>
  )
}

export default function TeacherOverview() {
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
