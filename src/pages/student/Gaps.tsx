import { BlockTitle, SampleTag } from '../../components/area/AreaBits'
import { plural, useClassGate } from '../../components/area/classGate'
import { Icon } from '../../components/Icon'
import { FamilyCard } from '../../components/student/FamilyCard'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatementCard } from '../../components/ui/StatementCard'
import { longDay } from '../../lib/attendance'
import { progressWords, RETRY_GOAL, useTopicProgress } from '../../lib/sampleData'
import { useMistakes, type Mistake } from '../../lib/useMistakes'

export default function StudentGaps() {
  const gate = useClassGate({ student: true })
  return gate ?? <GapsBody />
}

function GapsBody() {
  const progress = useTopicProgress()
  const retries = useMistakes()

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="where to focus" title="My gaps" />

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative">
          <StatementCard as="h2" title={`You’re strong at ${progress.strongest.name}. Keep working on`} highlight={`${progress.workingOn.name}.`} footer={['Last 4 weeks', 'Your parents see this too']}>
            <p>That’s it. No grades, no rankings. Just where you are and what to practice next.</p>
          </StatementCard>
          <SampleTag className="absolute right-6 top-6" />
        </div>
        <FamilyCard />
      </div>

      {/* Topic progress */}
      <section aria-labelledby="topics" className="mt-14">
        <BlockTitle id="topics" end={<SampleTag />}>
          How each topic is going
        </BlockTitle>
        <Frame label="topics.frame" className="mt-6" bodyClassName="p-5 md:p-7">
          <ul className="grid gap-6 md:grid-cols-2 md:gap-x-10">
            {progress.topics.map((t) => {
              const now = t.weeks[t.weeks.length - 1]
              const before = t.weeks[0]
              const change = now - before
              return (
                <li key={t.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-inter text-[16px] font-semibold">{t.name}</span>
                    <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-navy-soft">{progressWords(now)}</span>
                  </div>
                  <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-[#EEF4FB]" role="img" aria-label={`${t.name}: ${progressWords(now)}, ${change > 0.05 ? 'going up' : 'about the same'} over four weeks`}>
                    {/* Where it was four weeks ago, then where it is now */}
                    <div className="absolute inset-y-0 left-0 rounded-full bg-select/35" style={{ width: `${before * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-select transition-[width] duration-700" style={{ width: `${now * 100}%` }} />
                  </div>
                  <p className="mt-1.5 flex items-center gap-1 font-inter text-[14px] text-navy-soft">
                    <Icon name={change > 0.05 ? 'trending_up' : 'trending_flat'} className="text-[18px]" />
                    {change > 0.15 ? 'Up a lot in four weeks' : change > 0.05 ? 'Going up' : 'About the same. A retry could help.'}
                  </p>
                </li>
              )
            })}
          </ul>
          <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-dashed border-card-line pt-4 font-inter text-[14px] text-navy-soft">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-full bg-select/35" /> Four weeks ago
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-full bg-select" /> Now
            </span>
          </p>
        </Frame>
      </section>

      {/* Retry quizzes */}
      <section aria-labelledby="retries" className="mt-14">
        <BlockTitle id="retries">Retry quizzes</BlockTitle>
        <p className="mt-3 max-w-2xl rounded-xl bg-white/85 px-4 py-3 font-inter text-[15px] leading-6 text-navy backdrop-blur-sm">
          Questions you missed come back after 2 days, then after 7 days, until you get them right twice in a row. Your schedule is saved on this device for now.
        </p>
        {retries.loading ? (
          <p className="mt-6 font-inter text-[16px] text-navy">Loading…</p>
        ) : retries.error ? (
          <p role="alert" className="mt-6 font-inter text-[16px] text-navy">
            {retries.error}
          </p>
        ) : retries.mistakes.length === 0 ? (
          <EmptyState label="retry.frame" icon="check_circle" title="Nothing to retry" className="mt-6 max-w-xl" action={{ label: 'Go to quizzes', to: '/student/quizzes' }}>
            When you miss a question on a quiz, it lands here and comes back for another try.
          </EmptyState>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <Frame label="due.frame" bodyClassName="flex flex-col gap-4 p-6">
              <h3 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">{retries.due.length > 0 ? `${plural(retries.due.length, 'question')} ready now` : 'Nothing due today'}</h3>
              {retries.due.length > 0 ? (
                <>
                  <MistakeList items={retries.due} />
                  <Button to="/student/retry" variant="orange" size="lg" icon="replay" className="w-full sm:w-fit">
                    Start retry
                  </Button>
                </>
              ) : (
                <p className="font-inter text-[16px] leading-7 text-navy-soft">Your next retry shows up here when it’s due.</p>
              )}
            </Frame>
            <Frame label="later.frame" bodyClassName="flex flex-col gap-4 p-6">
              <h3 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">Coming back later</h3>
              {retries.upcoming.length > 0 ? <MistakeList items={retries.upcoming} showDue /> : <p className="font-inter text-[16px] leading-7 text-navy-soft">Nothing waiting.</p>}
              {retries.learned.length > 0 && (
                <p className="flex items-center gap-2 rounded-xl bg-[#E3F5EA] px-4 py-3 font-inter text-[15px] text-[#1F5C35]">
                  <Icon name="verified" className="text-[20px]" filled />
                  {plural(retries.learned.length, 'question')} learned: right twice in a row.
                </p>
              )}
            </Frame>
          </div>
        )}
      </section>
    </>
  )
}

function MistakeList({ items, showDue = false }: { items: Mistake[]; showDue?: boolean }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.slice(0, 5).map((m) => (
        <li key={m.questionId} className="rounded-2xl border border-card-line p-4">
          <p className="font-inter text-[15px] font-semibold leading-6">{m.text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-inter text-[13px] text-navy-soft">
            <span>{m.quizTitle}</span>
            {showDue && <span>Back {longDay(m.schedule.due)}</span>}
            <span className="flex items-center gap-1" aria-label={`Right ${m.schedule.streak} of ${RETRY_GOAL} times`}>
              {Array.from({ length: RETRY_GOAL }, (_, i) => (
                <span key={i} aria-hidden="true" className={`size-2.5 rounded-full ${i < m.schedule.streak ? 'bg-[#1F6B3A]' : 'border border-navy/30'}`} />
              ))}
            </span>
          </div>
        </li>
      ))}
      {items.length > 5 && <li className="font-inter text-[14px] text-navy-soft">And {items.length - 5} more.</li>}
    </ul>
  )
}
