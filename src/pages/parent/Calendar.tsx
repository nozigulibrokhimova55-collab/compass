import { Loading } from '../../components/area/AreaBits'
import { ViewerCalendar } from '../../components/course/ViewerCalendar'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageNotice } from '../../components/ui/PageNotice'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { getBook } from '../../lib/books'
import { useChildCalendars } from '../../lib/useCalendars'

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

/** A parent's view of their children's class calendars. Real data, read-only. */
export default function ParentCalendar() {
  const { loading, error, children } = useChildCalendars()
  const withCalendars = children.filter((c) => c.calendars.length > 0)
  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="in class" title="Calendar" />
      {loading ? (
        <Loading />
      ) : error ? (
        <PageNotice label="error.frame" title="We couldn’t load the calendar" alert>
          {error}
        </PageNotice>
      ) : withCalendars.length === 0 ? (
        <EmptyState label="calendar.frame" icon="calendar_month" title={children.length === 0 ? 'No child linked yet' : 'No class calendar yet'} className="mt-10 max-w-xl" action={children.length === 0 ? { label: 'Link your child', to: '/parent/settings' } : undefined}>
          {children.length === 0 ? 'Add your child’s invite code in Settings to see their classes.' : 'When the teacher plans the term, you’ll see each class and what it covers here.'}
        </EmptyState>
      ) : (
        withCalendars.flatMap((child) =>
          child.calendars.map((c) => <ViewerCalendar key={`${child.childId}-${c.classId}`} calendar={c} heading={`${firstName(child.childName)} · ${getBook(c.bookId)?.syllabus.title ?? 'Class'}`} />),
        )
      )}
    </>
  )
}
