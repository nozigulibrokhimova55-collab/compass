import { useEffect, useState } from 'react'
import { BlockTitle, Loading } from '../../components/area/AreaBits'
import { SlotPicker } from '../../components/meetings/SlotPicker'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Frame } from '../../components/ui/Frame'
import { PageNotice } from '../../components/ui/PageNotice'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { errorMessage } from '../../lib/db'
import { bookSlot, cancelMeeting, fetchFreeSlots, rescheduleMeeting, type FreeSlot, type MeetingTeacher, type ParentMeeting } from '../../lib/meetingsDb'
import { isUpcoming, slotLabel } from '../../lib/meetingTime'
import { useParentMeetings } from '../../lib/useMeetings'

type DialogState = { kind: 'move' | 'cancel'; meeting: ParentMeeting }

/** Parent Meetings: book a 60 minute meeting with a child's teacher, and move or cancel it. */
export default function ParentMeetings() {
  const { loading, error, teachers, meetings, reload } = useParentMeetings()
  const [dialog, setDialog] = useState<DialogState | null>(null)

  if (loading) return <Loading />
  if (error) {
    return (
      <PageNotice label="error.frame" title="We couldn’t load meetings" alert>
        {error} Check your connection, then reload the page.
      </PageNotice>
    )
  }

  const upcoming = meetings.filter((m) => isUpcoming(m.startsAt))
  const past = meetings.filter((m) => !isUpcoming(m.startsAt)).reverse()

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="with the teacher" title="Meetings" />
      <p className="mt-4 w-fit max-w-2xl rounded-xl bg-white/85 px-4 py-3 font-inter text-[15px] leading-6 text-navy backdrop-blur-sm">
        Book a 60 minute meeting with your child’s teacher. All times are Seoul time.
      </p>

      {/* Booked meetings */}
      <section aria-labelledby="yours" className="mt-12">
        <BlockTitle id="yours">{`Your meetings · ${upcoming.length}`}</BlockTitle>
        {upcoming.length === 0 ? (
          <EmptyState label="yours.frame" icon="event_busy" title="No meetings booked" className="mt-6 max-w-xl">
            When you book a time, it shows up here. You can move or cancel it any time before it starts.
          </EmptyState>
        ) : (
          <ul className="mt-6 grid gap-6">
            {upcoming.map((m) => (
              <li key={m.slotId}>
                <Frame label="meeting.frame" bodyClassName="p-5 md:p-7">
                  <h3 className="font-grotesk text-[22px] font-extrabold leading-tight tracking-[-0.01em]">{slotLabel(m.startsAt, m.endsAt)}</h3>
                  <p className="mt-1 font-inter text-[16px] text-navy-soft">
                    With {m.teacherName}, about {m.studentName ?? 'your child'}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button variant="outline" icon="event_repeat" onClick={() => setDialog({ kind: 'move', meeting: m })}>
                      Move
                    </Button>
                    <Button variant="outline" icon="event_busy" onClick={() => setDialog({ kind: 'cancel', meeting: m })}>
                      Cancel
                    </Button>
                  </div>
                </Frame>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Book */}
      <section aria-labelledby="book" className="mt-14">
        <BlockTitle id="book">Book a meeting</BlockTitle>
        {teachers.length === 0 ? (
          <EmptyState
            label="book.frame"
            icon="school"
            title="No teachers to meet yet"
            className="mt-6 max-w-xl"
            action={{ label: 'Link a child', to: '/parent/settings', icon: 'link' }}
          >
            Once your child is linked and in a class, their teacher’s free times show up here.
          </EmptyState>
        ) : (
          <div className="mt-6 grid gap-6">
            {teachers.map((t) => (
              <BookCard
                key={`${t.childId}-${t.teacherId}`}
                pair={t}
                hasMeeting={upcoming.some((m) => m.teacherId === t.teacherId && m.studentId === t.childId)}
                onBooked={reload}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent */}
      {past.length > 0 && (
        <section aria-labelledby="recent" className="mt-14">
          <BlockTitle id="recent">Recent meetings</BlockTitle>
          <Frame label="recent.frame" className="mt-6" bodyClassName="p-5 md:p-6">
            <ul>
              {past.map((m) => (
                <li key={m.slotId} className="border-b border-card-line py-3 font-inter text-[16px] last:border-b-0">
                  <span className="font-semibold">{slotLabel(m.startsAt, m.endsAt)}</span>
                  <span className="text-navy-soft">
                    {' '}
                    · {m.teacherName}, about {m.studentName ?? 'your child'}
                  </span>
                </li>
              ))}
            </ul>
          </Frame>
        </section>
      )}

      <Dialog open={dialog !== null} onClose={() => setDialog(null)} title={dialog?.kind === 'cancel' ? 'Cancel this meeting' : 'Move this meeting'}>
        {dialog && <MeetingAction dialog={dialog} onDone={reload} onClose={() => setDialog(null)} />}
      </Dialog>
    </>
  )
}

/** One child and one of their teachers: see the free times and book one. */
function BookCard({ pair, hasMeeting, onBooked }: { pair: MeetingTeacher; hasMeeting: boolean; onBooked: () => Promise<void> }) {
  const notify = useToast()
  const [open, setOpen] = useState(false)
  const [slots, setSlots] = useState<FreeSlot[] | null>(null)
  const [choice, setChoice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const show = async () => {
    setOpen(true)
    setError(null)
    setSlots(null)
    setChoice(null)
    try {
      setSlots(await fetchFreeSlots(pair.teacherId, pair.childId))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const book = async () => {
    if (!choice) return
    setBusy(true)
    setError(null)
    try {
      await bookSlot(choice, pair.childId)
      notify('Meeting booked.', 'event_available')
      setOpen(false)
      await onBooked()
    } catch (err) {
      setError(errorMessage(err))
      // Most often someone else just took it, so show the times that are still free.
      try {
        setSlots(await fetchFreeSlots(pair.teacherId, pair.childId))
        setChoice(null)
      } catch {
        /* keep the times we have */
      }
    } finally {
      setBusy(false)
    }
  }

  const chosen = slots?.find((s) => s.slotId === choice)

  return (
    <Frame label="book_meeting.frame" bodyClassName="p-5 md:p-7">
      <h3 className="font-grotesk text-[22px] font-extrabold leading-tight tracking-[-0.01em]">
        {pair.teacherName}, about {pair.childName}
      </h3>

      {hasMeeting ? (
        <p className="mt-3 rounded-xl bg-[#F3F7FC] px-4 py-3 font-inter text-[15px] leading-6">You already have a meeting with {pair.teacherName}. Move it or cancel it above to pick another time.</p>
      ) : !open ? (
        <div className="mt-4">
          <Button variant="orange" icon="event" onClick={show}>
            See free times
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          {slots === null && !error && (
            <p role="status" className="font-inter text-[15px] text-navy-soft">
              Loading times…
            </p>
          )}
          {slots !== null && slots.length === 0 && (
            <p className="rounded-xl bg-[#F3F7FC] px-4 py-3 font-inter text-[15px] leading-6">{pair.teacherName} hasn’t posted any free times right now. Check back soon.</p>
          )}
          {slots !== null && slots.length > 0 && <SlotPicker slots={slots} value={choice} onChange={setChoice} legend={`Free times with ${pair.teacherName}`} name={`book-${pair.childId}-${pair.teacherId}`} />}
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-[#FBE1D8] px-4 py-3 font-inter text-[15px] leading-6 text-[#9C3412]">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            {slots !== null && slots.length > 0 && (
              <Button variant="orange" icon="event_available" onClick={book} disabled={!choice || busy}>
                {busy ? 'Booking…' : chosen ? `Book ${slotLabel(chosen.startsAt, chosen.endsAt)}` : 'Pick a time to book'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Frame>
  )
}

/** The inside of the move and cancel dialogs. It is only shown while open, so it starts fresh every time. */
function MeetingAction({ dialog, onDone, onClose }: { dialog: DialogState; onDone: () => Promise<void>; onClose: () => void }) {
  const notify = useToast()
  const { kind, meeting } = dialog
  const [slots, setSlots] = useState<FreeSlot[] | null>(null)
  const [choice, setChoice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Moving needs the teacher's other free times.
  useEffect(() => {
    if (kind !== 'move' || !meeting.studentId) return
    let live = true
    fetchFreeSlots(meeting.teacherId, meeting.studentId)
      .then((list) => {
        if (live) setSlots(list)
      })
      .catch((err) => {
        if (live) setError(errorMessage(err))
      })
    return () => {
      live = false
    }
  }, [kind, meeting.teacherId, meeting.studentId])

  const run = async () => {
    setError(null)
    if (kind === 'move' && !choice) {
      setError('Pick a new time first.')
      return
    }
    setBusy(true)
    try {
      if (kind === 'move' && choice) {
        await rescheduleMeeting(meeting.slotId, choice)
        notify('Meeting moved. Your old time is free again.', 'event_repeat')
      } else {
        await cancelMeeting(meeting.slotId)
        notify('Meeting cancelled.', 'event_busy')
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
            Pick a new time with {meeting.teacherName}. Now it’s {slotLabel(meeting.startsAt, meeting.endsAt)}. That time becomes free for other parents.
          </p>
          <div className="mt-4">
            {!meeting.studentId ? (
              <p className="rounded-xl bg-[#F3F7FC] px-4 py-3 font-inter text-[15px] leading-6">We can’t move this one. Cancel it and book a new time instead.</p>
            ) : slots === null && !error ? (
              <p role="status" className="font-inter text-[15px] text-navy-soft">
                Loading times…
              </p>
            ) : slots !== null && slots.length === 0 ? (
              <p className="rounded-xl bg-[#F3F7FC] px-4 py-3 font-inter text-[15px] leading-6">{meeting.teacherName} has no other free times right now. Check back soon, or keep this one.</p>
            ) : (
              slots !== null && <SlotPicker slots={slots} value={choice} onChange={setChoice} legend="New time" name="move-slot" />
            )}
          </div>
        </>
      ) : (
        <p className="font-inter text-[16px] leading-7">
          Cancel your meeting with {meeting.teacherName} about {meeting.studentName ?? 'your child'} on {slotLabel(meeting.startsAt, meeting.endsAt)}? The time becomes free for other parents.
        </p>
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
        <Button variant={kind === 'cancel' ? 'orange' : 'navy'} onClick={run} disabled={busy || (kind === 'move' && (!meeting.studentId || !slots || slots.length === 0))}>
          {busy ? 'Saving…' : kind === 'cancel' ? 'Cancel meeting' : 'Move meeting'}
        </Button>
      </div>
    </div>
  )
}
