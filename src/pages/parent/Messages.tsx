import { useState, type FormEvent } from 'react'
import { SampleTag } from '../../components/area/AreaBits'
import { ChildSwitcher } from '../../components/parent/ChildSwitcher'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui/Button'
import { inputClass } from '../../components/ui/Field'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { ThreadCard, type ThreadItem } from '../../components/ui/ThreadCard'
import { initialsOf } from '../../lib/people'
import { useChildren, useMessages, useParentUpdates, type MessageSection } from '../../lib/sampleData'
import { useSession } from '../../lib/session'
import { ParentSampleNote } from './Home'

const SECTIONS: { id: MessageSection; label: string }[] = [
  { id: 'this_week', label: '01 · This week' },
  { id: 'working_on', label: '02 · Working on' },
  { id: 'how_to_help', label: '03 · How you can help' },
]

export default function ParentMessages() {
  const { user } = useSession()
  const notify = useToast()
  const { selected } = useChildren()
  const { update: u } = useParentUpdates(selected.id)
  const { replies, send } = useMessages(selected.id)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  const teacher = { name: u.teacher.name, initials: u.teacher.initials, tone: 'orange' as const }
  const me = { name: user.name, initials: initialsOf(user.name), tone: 'beige' as const }

  const items: ThreadItem[] = SECTIONS.flatMap((section) => [
    { kind: 'divider' as const, label: section.label },
    ...u.messages.filter((m) => m.section === section.id).map((m) => ({ kind: 'message' as const, from: teacher, time: m.time, text: m.text })),
  ])
  if (replies.length > 0) {
    items.push({ kind: 'divider', label: '04 · Your replies' }, ...replies.map((r) => ({ kind: 'message' as const, from: me, time: r.time, text: r.text, mine: true })))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) {
      setError('Write a message first.')
      document.getElementById('reply')?.focus()
      return
    }
    send(draft)
    setDraft('')
    setError('')
    notify(`Reply saved. ${u.teacher.name} will see replies once messages are connected.`, 'send')
  }

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="from school" title="Messages" />
      <ChildSwitcher className="mt-6" />
      <ParentSampleNote />

      <ThreadCard
        className="mt-8 max-w-3xl"
        title={`${u.teacher.name} about ${u.firstName}`}
        subtitle={`${u.className} · ${u.weekLabel}`}
        people={[teacher, me]}
        headerEnd={<SampleTag />}
        items={items}
        footer={
          <form onSubmit={submit} noValidate className="flex flex-col gap-3">
            <label htmlFor="reply" className="font-inter text-[15px] font-semibold">
              Reply to {u.teacher.name}
            </label>
            <textarea
              id="reply"
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'reply-error' : 'reply-hint'}
              placeholder="Thanks! We tried the palms game at dinner."
              className={`${inputClass} resize-y py-3 leading-6`}
            />
            {error ? (
              <p id="reply-error" className="font-inter text-[14px] font-medium text-accent-strong">
                {error}
              </p>
            ) : (
              <p id="reply-hint" className="font-inter text-[14px] text-navy-soft">
                Replies are kept on this device for now.
              </p>
            )}
            <Button type="submit" variant="orange" icon="send" className="w-full sm:w-fit">
              Send reply
            </Button>
          </form>
        }
      />
    </>
  )
}
