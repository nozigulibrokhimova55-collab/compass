import { chapterOf, pagesLabel, sectionOf, type Book } from './books'
import { atPage } from './courseDb'
import type { SessionKind } from './schedulePlan'

type SessionLike = { kind: SessionKind; chapter: number | null; sectionId: string | null }

/**
 * Where to read for a session: a lesson opens its section's first page, a chapter quiz opens the chapter.
 * `links` are the signed chapter PDF links (null while loading or when the PDFs aren't there).
 */
export function sessionReading(book: Book, links: Record<number, string> | null, s: SessionLike): { href: string | null; label: string } | null {
  if (s.kind === 'lesson' && s.sectionId) {
    const found = sectionOf(book, s.sectionId)
    if (!found) return null
    const link = links?.[found.chapter.number]
    return { href: link ? atPage(link, book, found.chapter, found.section.start_page) : null, label: `Read ${pagesLabel(found.section.start_page, found.section.end_page)}` }
  }
  if (s.kind === 'chapter_quiz' && s.chapter !== null) {
    const ch = chapterOf(book, s.chapter)
    if (!ch) return null
    const link = links?.[ch.number]
    return { href: link ? atPage(link, book, ch, ch.start_page) : null, label: `Chapter ${ch.number} PDF` }
  }
  return null
}

/** Today's session and the next one after today (cancelled days skipped). */
export function todayAndNext<T extends { day: string; kind: SessionKind }>(sessions: T[], today: string) {
  const live = sessions.filter((s) => s.kind !== 'cancelled')
  return {
    today: sessions.find((s) => s.day === today && s.kind !== 'cancelled') ?? null,
    cancelledToday: sessions.some((s) => s.day === today && s.kind === 'cancelled') && !live.some((s) => s.day === today),
    next: live.find((s) => s.day > today) ?? null,
  }
}
