import { BlockTitle, SampleTag } from '../../components/area/AreaBits'
import { Icon } from '../../components/Icon'
import { ChildSwitcher } from '../../components/parent/ChildSwitcher'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { progressWords, useChildren, useParentUpdates, type TopicProgress } from '../../lib/sampleData'
import { ParentSampleNote } from './Home'

const WEEK_LABELS = ['3 weeks ago', '2 weeks ago', 'Last week', 'This week']

/** Plain words for the change over four weeks. */
function trend(t: TopicProgress) {
  const change = t.weeks[t.weeks.length - 1] - t.weeks[0]
  if (change > 0.15) return { icon: 'trending_up', text: 'Growing fast' }
  if (change > 0.05) return { icon: 'trending_up', text: 'Growing' }
  return { icon: 'trending_flat', text: 'Steady. This is the one to practice.' }
}

export default function ParentProgress() {
  const { selected } = useChildren()
  const { update: u } = useParentUpdates(selected.id)

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="over time" title="Progress" />
      <ChildSwitcher className="mt-6" />
      <ParentSampleNote />

      <section aria-labelledby="topics" className="mt-10">
        <BlockTitle id="topics" end={<SampleTag />}>
          {`${u.firstName}’s topics · last 4 weeks`}
        </BlockTitle>
        <ul className="mt-6 grid gap-6 md:grid-cols-2">
          {u.topics.map((t, i) => {
            const now = t.weeks[t.weeks.length - 1]
            const tr = trend(t)
            return (
              <li key={t.id}>
                <Frame label={`topic_${String(i + 1).padStart(2, '0')}.frame`} className="h-full" bodyClassName="flex h-full flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-grotesk text-[20px] font-extrabold leading-tight tracking-[-0.01em]">{t.name}</h2>
                    <span className="shrink-0 rounded-full bg-[#EEF4FB] px-2.5 py-0.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em]">{progressWords(now)}</span>
                  </div>
                  {/* Four weekly columns, oldest first */}
                  <div className="mt-5 flex h-24 items-end gap-2" role="img" aria-label={`${t.name}: ${tr.text.toLowerCase()} over four weeks, now ${progressWords(now).toLowerCase()}`}>
                    {t.weeks.map((w, j) => (
                      <div key={j} className="flex h-full flex-1 flex-col justify-end">
                        <div className={`rounded-t-lg ${j === t.weeks.length - 1 ? 'bg-select' : 'bg-select/35'}`} style={{ height: `${Math.max(w * 100, 6)}%` }} />
                      </div>
                    ))}
                  </div>
                  <div aria-hidden="true" className="mt-1.5 flex gap-2">
                    {WEEK_LABELS.map((l) => (
                      <span key={l} className="flex-1 text-center font-mono text-[10px] uppercase leading-tight tracking-[0.06em] text-navy-soft">
                        {l}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 flex items-center gap-1.5 font-inter text-[15px] text-navy">
                    <Icon name={tr.icon} className="text-[20px] text-select" />
                    {tr.text}
                  </p>
                </Frame>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 w-fit rounded-xl bg-white/85 px-4 py-2 font-inter text-[14px] text-navy backdrop-blur-sm">
          This shows {u.firstName} against {u.firstName}, week to week. Never against other students.
        </p>
      </section>

      <section aria-labelledby="quizzes" className="mt-14">
        <BlockTitle id="quizzes" end={<SampleTag />}>
          Recent quizzes
        </BlockTitle>
        <Frame label="quizzes.frame" className="mt-6 max-w-3xl" bodyClassName="px-6 py-2">
          <ul className="divide-y divide-card-line">
            {u.quizzes.map((q) => (
              <li key={q.title} className="flex gap-3 py-4">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${q.done ? 'bg-[#E3F5EA] text-[#1F5C35]' : 'bg-[#F3F7FC] text-navy'}`}>
                  <Icon name={q.done ? 'task_alt' : 'schedule'} className="text-[22px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-inter text-[16px] font-semibold leading-6">{q.title}</p>
                  <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-navy-soft">{q.when}</p>
                  <p className="mt-1 font-inter text-[15px] leading-6 text-navy-soft">{q.plain}</p>
                </div>
              </li>
            ))}
          </ul>
        </Frame>
      </section>
    </>
  )
}
