import { getBook } from '../../lib/books'
import type { CourseCalendar } from '../../lib/courseDb'
import { toIso } from '../../lib/schedulePlan'
import { usePdfLinks } from '../../lib/useCalendars'
import { useToday } from '../../lib/useToday'
import { BlockTitle } from '../area/AreaBits'
import { Button } from '../ui/Button'
import { BookAttribution } from './CourseBits'
import { NowCards, SessionMonths } from './SessionViews'

/**
 * A class calendar for students and parents, read-only. `summary` shows only "Today" and "Next class"
 * with a link to the full calendar; otherwise every class by month.
 */
export function ViewerCalendar({ calendar, heading, summary = false, calendarLink, marks }: { calendar: CourseCalendar; heading: string; summary?: boolean; calendarLink?: string; marks?: Record<string, string> }) {
  const today = toIso(useToday())
  const book = getBook(calendar.bookId)
  const { links } = usePdfLinks(book)
  if (!book) return null
  const id = `cal-${calendar.classId}`

  return (
    <section aria-labelledby={id} className="mt-10">
      <BlockTitle id={id} end={summary && calendarLink ? <Button to={calendarLink} variant="outline" icon="calendar_month">See the calendar</Button> : undefined}>
        {heading}
      </BlockTitle>
      <NowCards book={book} sessions={calendar.sessions} links={links} today={today} className="mt-6" />
      {!summary && (
        <div className="mt-10">
          <SessionMonths book={book} sessions={calendar.sessions} links={links} today={today} marks={marks} />
        </div>
      )}
      <BookAttribution book={book} className="mt-6 w-fit max-w-3xl rounded-2xl bg-white/90 px-4 py-3 backdrop-blur-sm" />
    </section>
  )
}
