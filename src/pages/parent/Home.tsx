import { SampleNote, SampleTag } from '../../components/area/AreaBits'
import { Bento, BentoItem } from '../../components/area/Bento'
import { Icon } from '../../components/Icon'
import { ChildSwitcher } from '../../components/parent/ChildSwitcher'
import { Button } from '../../components/ui/Button'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatCard } from '../../components/ui/StatCard'
import { StatementCard } from '../../components/ui/StatementCard'
import { StickyNote } from '../../components/ui/StickyNote'
import { useChildren, useParentUpdates } from '../../lib/sampleData'

/** The parent banner every parent page shows while their pages run on sample data. */
export function ParentSampleNote() {
  return <SampleNote className="mt-6 max-w-3xl">These pages show a sample family for now. Your own child’s updates will appear here once they’re connected.</SampleNote>
}

/** Parent Home: one child's week in plain words, and one thing to ask tonight. */
export default function ParentHome() {
  const { selected } = useChildren()
  const { update: u } = useParentUpdates(selected.id)

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="this week" title={`How’s ${u.firstName}?`} />
      <ChildSwitcher className="mt-6" />
      <ParentSampleNote />

      <Bento className="mt-8">
        <BentoItem span={4}>
          <StatementCard as="h2" className="h-full" title={u.thisWeek.title} highlight={u.thisWeek.highlight} footer={[u.weekLabel, u.className]}>
            <p>{u.thisWeek.body}</p>
            <div className="mt-6">
              <Button to="/parent/messages" variant="navy" icon="forum">
                Read {u.teacher.name}’s note
              </Button>
            </div>
          </StatementCard>
        </BentoItem>

        <BentoItem span={2}>
          <div className="flex h-full items-center justify-center py-4">
            <StickyNote tilt={2} className="w-full max-w-none">
              <span className="block font-hand text-[26px] font-bold leading-7">One thing to ask tonight</span>
              <span className="mt-2 block font-inter text-[19px] font-semibold leading-7">{u.askTonight}</span>
              <span className="mt-3 block text-[14px]">Let them explain it. No need to know the answer yourself.</span>
            </StickyNote>
          </div>
        </BentoItem>

        <BentoItem span={2}>
          <Frame label="strengths.frame" className="h-full" bodyClassName="h-full p-6">
            <h2 className="font-grotesk text-[20px] font-extrabold tracking-[-0.01em]">Doing well</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {u.strengths.map((s) => (
                <li key={s.topic} className="flex gap-2.5 font-inter text-[16px] leading-6">
                  <Icon name="check_circle" className="mt-0.5 text-[20px] text-[#1F6B3A]" filled />
                  <span>
                    <span className="font-semibold">{s.topic}.</span> <span className="text-navy-soft">{s.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Frame>
        </BentoItem>

        <BentoItem span={2}>
          <Frame label="working_on.frame" className="h-full" bodyClassName="h-full p-6">
            <h2 className="font-grotesk text-[20px] font-extrabold tracking-[-0.01em]">Working on</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {u.workingOn.map((s) => (
                <li key={s.topic} className="flex gap-2.5 font-inter text-[16px] leading-6">
                  <Icon name="construction" className="mt-0.5 text-[20px] text-accent-strong" />
                  <span>
                    <span className="font-semibold">{s.topic}.</span> <span className="text-navy-soft">{s.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Frame>
        </BentoItem>

        <BentoItem span={2}>
          <StatCard
            className="h-full"
            title="Class this week"
            stats={[
              { value: String(u.attendance.here + u.attendance.late), symbol: `/${u.attendance.days}`, label: 'Days here' },
              { value: String(u.attendance.missed), label: 'Missed' },
            ]}
            note={
              u.attendance.missed > 0
                ? `${u.firstName} missed a day and got a short catch-up check for it.`
                : u.attendance.late > 0
                  ? `Late once. Late still counts as here.`
                  : 'Here every day.'
            }
          />
        </BentoItem>
      </Bento>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button to="/parent/progress" variant="outline" icon="trending_up">
          See progress
        </Button>
        <SampleTag />
      </div>
    </>
  )
}
