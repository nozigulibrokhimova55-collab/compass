import { Loading } from '../../components/area/AreaBits'
import { useClassGate } from '../../components/area/classGate'
import { ViewerCalendar } from '../../components/course/ViewerCalendar'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageNotice } from '../../components/ui/PageNotice'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useMyCalendars } from '../../lib/useCalendars'

/** The student's class calendars: today, next class, and every class with its pages. Read-only. */
export default function StudentCalendar() {
  const gate = useClassGate({ student: true })
  return gate ?? <CalendarBody />
}

function CalendarBody() {
  const { loading, error, calendars } = useMyCalendars()
  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="what’s next" title="Calendar" />
      {loading ? (
        <Loading />
      ) : error ? (
        <PageNotice label="error.frame" title="We couldn’t load the calendar" alert>
          {error}
        </PageNotice>
      ) : calendars.length === 0 ? (
        <EmptyState label="calendar.frame" icon="calendar_month" title="No class calendar yet" className="mt-10 max-w-xl">
          When your teacher plans the term, you’ll see each class and the pages to read here.
        </EmptyState>
      ) : (
        calendars.map((c) => <ViewerCalendar key={c.classId} calendar={c} heading={c.className ?? 'Your class'} />)
      )}
    </>
  )
}
