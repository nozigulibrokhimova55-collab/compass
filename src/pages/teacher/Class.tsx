import { BlockTitle } from '../../components/area/AreaBits'
import { plural, useClassGate } from '../../components/area/classGate'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatementCard } from '../../components/ui/StatementCard'
import { StickyNote } from '../../components/ui/StickyNote'
import { Avatar } from '../../components/ui/ThreadCard'
import { useClassData } from '../../lib/classData'

export default function TeacherClass() {
  const gate = useClassGate()
  return gate ?? <ClassBody />
}

function ClassBody() {
  const notify = useToast()
  const { cls, students } = useClassData()
  if (!cls) return null

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text)
      notify(done, 'content_copy')
    } catch {
      notify('Couldn’t copy. Select the code and copy it by hand.', 'info')
    }
  }
  const invite = `Join ${cls.name} on Compass: sign up as a student at ${window.location.origin}/signup?role=student and type the class code ${cls.code}.`

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="your people" title="Class" />

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <StatementCard as="h2" title={`Students join ${cls.name} with`} highlight={cls.code} footer={[cls.unit ?? 'Your class', plural(students.length, 'student')]}>
          <p>Students type this code when they sign up, and they land in your class. Parents link up later with their child’s own invite code.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="orange" icon="content_copy" onClick={() => copy(cls.code, 'Class code copied.')}>
              Copy code
            </Button>
            <Button variant="outline" icon="forward_to_inbox" onClick={() => copy(invite, 'Invite message copied. Paste it anywhere.')}>
              Copy an invite message
            </Button>
          </div>
        </StatementCard>

        <div className="flex justify-center pt-4 lg:justify-start">
          <StickyNote tilt={2}>
            <span className="font-hand text-[22px] font-bold leading-7">Tip:</span> write the code on the board on day one. Students can join from their phones in a minute.
          </StickyNote>
        </div>
      </div>

      <section aria-labelledby="roster" className="mt-16">
        <BlockTitle id="roster">{`Students · ${students.length}`}</BlockTitle>
        {students.length === 0 ? (
          <EmptyState
            label="students.frame"
            icon="group_add"
            title="No students yet"
            className="mt-6 max-w-xl"
            action={{ label: 'Copy the class code', icon: 'content_copy', onClick: () => copy(cls.code, 'Class code copied.') }}
          >
            Share your code <span className="font-mono font-semibold text-navy">{cls.code}</span>. Each student shows up here as soon as they sign up with it.
          </EmptyState>
        ) : (
          <Frame label="students.frame" className="mt-6">
            <ul className="grid gap-x-10 gap-y-1 sm:grid-cols-2">
              {students.map((s) => (
                <li key={s.id} className="flex min-h-12 items-center gap-3 border-b border-card-line py-2 font-inter text-[16px] last:border-b-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0">
                  <Avatar person={{ name: s.name, initials: s.initials }} size="sm" />
                  {s.name}
                </li>
              ))}
            </ul>
          </Frame>
        )}
      </section>
    </>
  )
}
