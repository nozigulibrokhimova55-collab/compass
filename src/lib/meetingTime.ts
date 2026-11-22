// Meeting times are stored as exact moments (timestamptz) and always shown in Seoul time.
// Korea has no daylight saving, so a typed Seoul time is always +09:00 from UTC.

export const MEETING_TIMEZONE = 'Asia/Seoul'
/** Every meeting slot is exactly this long. The database enforces it too. */
export const MEETING_MINUTES = 60

const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: MEETING_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
const dayHeading = new Intl.DateTimeFormat('en-US', { timeZone: MEETING_TIMEZONE, weekday: 'long', month: 'long', day: 'numeric' })
const dayShort = new Intl.DateTimeFormat('en-US', { timeZone: MEETING_TIMEZONE, weekday: 'short', month: 'short', day: 'numeric' })
const clock = new Intl.DateTimeFormat('en-US', { timeZone: MEETING_TIMEZONE, hour: 'numeric', minute: '2-digit' })

/** A date ("2026-11-30") and a time ("15:00") typed in Seoul time, as an ISO string for the database. Null when they aren't valid. */
export function seoulToIso(day: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return null
  const date = new Date(`${day}T${time}:00+09:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** The Seoul calendar day of a moment, as YYYY-MM-DD. */
export function seoulDay(iso: string): string {
  return dayKey.format(new Date(iso))
}

/** Today's date in Seoul, as YYYY-MM-DD. */
export function seoulToday(): string {
  return dayKey.format(new Date())
}

/** "Monday, November 30" */
export function dayTitle(iso: string): string {
  return dayHeading.format(new Date(iso))
}

/** "3:00 PM to 4:00 PM" */
export function timeRange(startsAt: string, endsAt: string): string {
  return `${clock.format(new Date(startsAt))} to ${clock.format(new Date(endsAt))}`
}

/** "Mon, Nov 30, 3:00 PM to 4:00 PM" */
export function slotLabel(startsAt: string, endsAt: string): string {
  return `${dayShort.format(new Date(startsAt))}, ${timeRange(startsAt, endsAt)}`
}

/** True while the meeting hasn't started yet. */
export function isUpcoming(startsAt: string): boolean {
  return new Date(startsAt).getTime() > Date.now()
}

/** Groups items by Seoul day, oldest day first, keeping each day's order. */
export function groupByDay<T>(items: T[], startsAtOf: (item: T) => string): { day: string; title: string; items: T[] }[] {
  const days = new Map<string, { day: string; title: string; items: T[] }>()
  for (const item of items) {
    const iso = startsAtOf(item)
    const day = seoulDay(iso)
    const group = days.get(day) ?? { day, title: dayTitle(iso), items: [] }
    group.items.push(item)
    days.set(day, group)
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day))
}
