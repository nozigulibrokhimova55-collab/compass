import { useState } from 'react'
import { BlockTitle, Loading } from '../../components/area/AreaBits'
import { plural, useClassGate } from '../../components/area/classGate'
import { SlotPicker } from '../../components/meetings/SlotPicker'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Field, TextInput } from '../../components/ui/Field'
import { Frame } from '../../components/ui/Frame'
import { PageNotice } from '../../components/ui/PageNotice'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { errorMessage } from '../../lib/db'
import { cancelMeeting, postMeetingSlots, removeMeetingSlot, rescheduleMeeting, type MeetingProgress, type TeacherSlot } from '../../lib/meetingsDb'
import { groupByDay, isUpcoming, seoulToday, seoulToIso, slotLabel, timeRange } from '../../lib/meetingTime'
import { useTeacherMeetings } from '../../lib/useMeetings'

/** Start times offered as buttons: every hour from 08:00 to 19:00. Other times can be added by hand. */
const HOURS = Array.from({ length: 12 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`)

type DialogState = { kind: 'move' | 'cancel'; slot: TeacherSlot }

export default function TeacherMeetings() {
  const gate = useClassGate()
  return gate ?? <MeetingsBody />
}

function MeetingsBody() {
  const notify = useToast()
  const { loading, error, slots, reload } = useTeacherMeetings()
  const [day, setDay] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const [posting, setPosting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState | null>(null)

  if (loading) return <Loading />
  if (error) {
    return (
      <PageNotice label="error.frame" title="We couldn’t load your meetings" alert>
        {error} Check your connection, then reload the page.
      </PageNotice>
    )
  }

  const upcomingBooked = slots.filter((s) => s.booked && isUpcoming(s.startsAt))
  const freeSlots = slots.filter((s) => !s.booked && isUpcoming(s.startsAt))
  const pastBooked = slots.filter((s) => s.booked && !isUpcoming(s.startsAt)).reverse()
  const options = [...new Set([...HOURS, ...picked])].sort()

  const toggle = (t: string) => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t].sort()))
  const addCustom = () => {
    if (!/^\d{2}:\d{2}$/.test(custom)) return
    setPicked((p) => (p.includes(custom) ? p : [...p, custom].sort()))
    setCustom('')
  }

  const post = async () => {
    setFormError(null)
    if (!day) {
      setFormError('Pick a date first.')
      return
    }
    if (picked.length === 0) {
      setFormError('Pick at least one start time.')
      return
    }
    const starts = picked.map((t) => seoulToIso(day, t))
    if (starts.some((s) => s === null)) {
      setFormError('One of those times doesn’t look right.')
      return
    }
    setPosting(true)
    try {
      const n = await postMeetingSlots(starts as string[])
      notify(`${plural(n, 'time')} posted.`, 'event_available')
      setPicked([])
      await reload()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setPosting(false)
    }
  }

  const remove = async (s: TeacherSlot) => {
    try {
      await removeMeetingSlot(s.slotId)
      notify('Time removed.', 'delete')
      await reload()
    } catch (err) {
      notify(errorMessage(err), 'error')
      await reload()
    }
  }

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="parent meetings" title="Meetings" />
      <p className="mt-4 w-fit max-w-2xl rounded-xl bg-white/85 px-4 py-3 font-inter text-[15px] leading-6 text-navy backdrop-blur-sm">
        Post the times you’re free. Parents of your students book one. Every meeting is 60 minutes, and all times are Seoul time.
      </p>

      {/* Post free times */}
      <Frame label="post_times.frame" className="mt-8" bodyClassName="p-5 md:p-7">
        <h2 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">Post free times</h2>
        <div className="mt-4 max-w-xs">
          <Field id="meeting-day" label="Date" hint="Seoul time">
            <TextInput id="meeting-day" type="date" min={seoulToday()} value={day} onChange={(e) => setDay(e.target.value)} hint />
          </Field>
        </div>

        <fieldset className="mt-5">
          <legend className="font-inter text-[15px] font-semibold">Start times</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.map((t) => {
              const on = picked.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(t)}
                  className={`min-h-11 cursor-pointer rounded-xl border-2 px-4 font-mono text-[14px] font-semibold transition-colors duration-150 active:scale-[0.97] ${
                    on ? 'border-navy bg-navy text-white' : 'border-card-line bg-white text-navy hover:border-navy'
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>
          <p className="mt-2 font-inter text-[14px] text-navy-soft">Each start time is a 60 minute meeting. 15:00 means 15:00 to 16:00.</p>
        </fieldset>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-44">
            <Field id="meeting-custom" label="Another start time">
              <TextInput id="meeting-custom" type="time" step={300} value={custom} onChange={(e) => setCustom(e.target.value)} />
            </Field>
          </div>
          <Button variant="outline" icon="add" onClick={addCustom} disabled={!custom}>
            Add time
          </Button>
        </div>

        {formError && (
          <p role="alert" className="mt-5 rounded-xl bg-[#FBE1D8] px-4 py-3 font-inter text-[15px] leading-6 text-[#9C3412]">
            {formError}
          </p>
        )}

        <div className="mt-6">
          <Button variant="orange" icon="event_available" onClick={post} disabled={posting}>
            {posting ? 'Posting…' : picked.length > 0 ? `Post ${plural(picked.length, 'time')}` : 'Post times'}
          </Button>
        </div>
      </Frame>

      {/* Booked */}
      <section aria-labelledby="booked" className="mt-14">
        <BlockTitle id="booked">{`Booked · ${upcomingBooked.length}`}</BlockTitle>
        {upcomingBooked.length === 0 ? (
          <EmptyState label="booked.frame" icon="event_busy" title="No meetings booked yet" className="mt-6 max-w-xl">
            When a parent books one of your free times, it shows up here with a quick look at how their child is doing.
          </EmptyState>
        ) : (
          <ul className="mt-6 grid gap-6">
            {upcomingBooked.map((s) => (
              <li key={s.slotId}>
                <BookedCard slot={s} onMove={() => setDialog({ kind: 'move', slot: s })} onCancel={() => setDialog({ kind: 'cancel', slot: s })} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Free times */}
      <section aria-labelledby="free" className="mt-14">
        <BlockTitle id="free">{`Free times · ${freeSlots.length}`}</BlockTitle>
        {freeSlots.length === 0 ? (
          <EmptyState label="free_times.frame" icon="event" title="No free times posted" className="mt-6 max-w-xl">
            Pick a date and some start times above. Parents can only book times you’ve posted.
          </EmptyState>
        ) : (
          <Frame label="free_times.frame" className="mt-6" bodyClassName="p-5 md:p-6">
            <div className="grid gap-6">
              {groupByDay(freeSlots, (s) => s.startsAt).map((d) => (
                <div key={d.day}>
                  <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-navy-soft">{d.title}</p>
                  <ul className="mt-2">
                    {d.items.map((s) => (
                      <li key={s.slotId} className="flex min-h-14 items-center justify-between gap-3 border-b border-card-line py-2 font-inter text-[16px] last:border-b-0">
                        <span className="font-semibold">{timeRange(s.startsAt, s.endsAt)}</span>
                        <Button variant="outline" icon="delete" onClick={() => remove(s)}>
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Frame>
        )}
      </section>

      {/* Recent */}
      {pastBooked.length > 0 && (
        <section aria-labelledby="recent" className="mt-14">
          <BlockTitle id="recent">Recent meetings</BlockTitle>
          <Frame label="recent.frame" className="mt-6" bodyClassName="p-5 md:p-6">
            <ul>
              {pastBooked.map((s) => (
                <li key={s.slotId} className="border-b border-card-line py-3 font-inter text-[16px] last:border-b-0">
                  <span className="font-semibold">{slotLabel(s.startsAt, s.endsAt)}</span>
                  <span className="text-navy-soft">
                    {' '}
                    · {s.studentName ?? 'A student'}, with {s.parentName ?? 'a parent'}
                  </span>
                </li>
              ))}
            </ul>
          </Frame>
        </section>
      )}

      <Dialog open={dialog !== null} onClose={() => setDialog(null)} title={dialog?.kind === 'cancel' ? 'Cancel this meeting' : 'Move this meeting'}>
        {dialog && <MeetingAction dialog={dialog} freeSlots={freeSlots} onDone={reload} onClose={() => setDialog(null)} />}
      </Dialog>
    </>
  )
}

function BookedCard({ slot, onMove, onCancel }: { slot: TeacherSlot; onMove: () => void; onCancel: () => void }) {
  return (
    <Frame label="meeting.frame" bodyClassName="p-5 md:p-7">
      <h3 className="font-grotesk text-[22px] font-extrabold leading-tight tracking-[-0.01em]">{slotLabel(slot.startsAt, slot.endsAt)}</h3>
      <p className="mt-1 font-inter text-[16px] text-navy-soft">
        {slot.studentName ?? 'A student'} · booked by {slot.parentName ?? 'a parent'}
      </p>

      <div className="mt-4 rounded-2xl bg-[#F3F7FC] p-4">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-navy-soft">How they’re doing</p>
        <ProgressSummary progress={slot.progress} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="outline" icon="event_repeat" onClick={onMove}>
          Move
        </Button>
        <Button variant="outline" icon="event_busy" onClick={onCancel}>
          Cancel meeting
        </Button>
      </div>
    </Frame>
  )
}

/** Real quiz results only. With nothing finished, it says so instead of showing numbers. */
function ProgressSummary({ progress }: { progress: MeetingProgress | null }) {
  if (!progress || progress.quizzes === 0) {
    return <p className="mt-2 font-inter text-[15px] leading-6">No finished quizzes in your class yet, so there’s no progress to show.</p>
  }
  return (
    <>
      <p className="mt-2 font-inter text-[16px] font-semibold">
        {progress.quizzes === 1 ? '1 quiz' : `${progress.quizzes} quizzes`} finished
        {progress.average !== null ? ` · average ${progress.average}%` : ''}
      </p>
      <ul className="mt-2 grid gap-1 font-inter text-[15px] leading-6">
        {progress.recent.map((q, i) => (
          <li key={i}>
            {q.title}: <span className="font-semibold">{q.right} of {q.total}</span> right
          </li>
        ))}
      </ul>
    </>
  )
}

/** The inside of the move and cancel dialogs. It is only shown while open, so it starts fresh every time. */
function MeetingAction({ dialog, freeSlots, onDone, onClose }: { dialog: DialogState; freeSlots: TeacherSlot[]; onDone: () => Promise<void>; onClose: () => void }) {
  const notify = useToast()
  const { kind, slot } = dialog
  const [choice, setChoice] = useState<string | null>(null)
  const [removeToo, setRemoveToo] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const others = freeSlots.filter((s) => s.slotId !== slot.slotId)

  const run = async () => {
    setError(null)
    if (kind === 'move' && !choice) {
      setError('Pick a new time first.')
      return
    }
    setBusy(true)
    try {
      if (kind === 'move' && choice) {
        await rescheduleMeeting(slot.slotId, choice)
        notify('Meeting moved. The old time is free again.', 'event_repeat')
      } else {
        await cancelMeeting(slot.slotId, removeToo)
        notify(removeToo ? 'Meeting cancelled and the time removed.' : 'Meeting cancelled. The time is free again.', 'event_busy')
      }
      await onDone()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="mt-4">
      {kind === 'move' ? (
        <>
          <p className="font-inter text-[16px] leading-7">
            Pick a new time for {slot.studentName ?? 'this student'}. Now it’s {slotLabel(slot.startsAt, slot.endsAt)}. That time becomes free.
          </p>
          <div className="mt-4">
            {others.length === 0 ? (
              <p className="rounded-xl bg-[#F3F7FC] px-4 py-3 font-inter text-[15px] leading-6">You have no other free times. Post more times first.</p>
            ) : (
              <SlotPicker slots={others} value={choice} onChange={setChoice} legend="New time" name="move-slot" />
            )}
          </div>
        </>
      ) : (
        <>
          <p className="font-inter text-[16px] leading-7">
            Cancel the meeting with {slot.parentName ?? 'this parent'} about {slot.studentName ?? 'their child'} on {slotLabel(slot.startsAt, slot.endsAt)}?
          </p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 font-inter text-[15px] leading-6">
            <input type="checkbox" checked={removeToo} onChange={(e) => setRemoveToo(e.target.checked)} className="mt-1 size-5 accent-[#C9441A]" />
            Also remove this time, so nobody can book it again.
          </label>
        </>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-[#FBE1D8] px-4 py-3 font-inter text-[15px] leading-6 text-[#9C3412]">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="outline" onClick={onClose}>
          {kind === 'cancel' ? 'Keep meeting' : 'Close'}
        </Button>
        <Button variant={kind === 'cancel' ? 'orange' : 'navy'} onClick={run} disabled={busy || (kind === 'move' && others.length === 0)}>
          {busy ? 'Saving…' : kind === 'cancel' ? 'Cancel meeting' : 'Move meeting'}
        </Button>
      </div>
    </div>
  )
}
