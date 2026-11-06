import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useClassData } from '../../lib/classData'
import { MIGRATION_FILE } from '../../lib/courseDb'
import { pagesLabel, sectionOf, type Book } from '../../lib/books'
import type { ClassInfo } from '../../lib/db'
import type { SessionKind } from '../../lib/schedulePlan'
import { Loading } from '../area/AreaBits'
import { EmptyState } from '../ui/EmptyState'
import { PageNotice } from '../ui/PageNotice'

export const KIND_LABEL: Record<SessionKind, string> = {
  lesson: 'Lesson',
  chapter_quiz: 'Chapter quiz and review',
  review: 'Review / flexible',
  cancelled: 'Cancelled',
}


/**
 * The teacher's class, if the :id in the address is theirs. Otherwise a screen saying why not.
 * (Teachers have one class in this app; the id keeps links stable for when they have more.)
 */
export function useTeacherClass(): { ok: true; cls: ClassInfo } | { ok: false; cls: null; screen: ReactNode } {
  const { id } = useParams()
  const { loading, error, cls } = useClassData()
  if (loading) return { ok: false, cls: null, screen: <Loading /> }
  if (error) {
    return {
      ok: false,
      cls: null,
      screen: (
        <PageNotice label="error.frame" title="We couldn’t load your class" alert>
          {error}
        </PageNotice>
      ),
    }
  }
  if (!cls || cls.id !== id) {
    return {
      ok: false,
      cls: null,
      screen: (
        <EmptyState label="class.frame" icon="search_off" title="We can’t find that class" className="mt-10 max-w-xl" action={{ label: 'Back to your class', to: '/teacher/class', icon: 'arrow_back' }}>
          The link may be old, or the class belongs to someone else.
        </EmptyState>
      ),
    }
  }
  return { ok: true, cls }
}

/** Loading, "run the migration", and error screens for course pages. Returns null when the page can go ahead. */
export function courseGate(course: { loading: boolean; error: string | null; missingMigration: boolean }) {
  if (course.loading) return <Loading />
  if (course.missingMigration) {
    return (
      <PageNotice label="setup.frame" title="The calendar isn’t switched on yet">
        Its tables need to be added to the database once. Ask Mauricio (or anyone with access to Supabase) to run <span className="font-mono text-[14px] text-navy">{MIGRATION_FILE}</span> in the SQL
        Editor, then reload this page.
      </PageNotice>
    )
  }
  if (course.error) {
    return (
      <PageNotice label="error.frame" title="We couldn’t load the course" alert>
        {course.error}
      </PageNotice>
    )
  }
  return null
}

/** Session text: "1.4 Conservation of energy · class 1 of 2", "Chapter 2 quiz and review", "Review / flexible". */
export function sessionTitle(book: Book, s: { kind: SessionKind; chapter: number | null; sectionId: string | null; part: number; parts: number }) {
  if (s.kind === 'lesson' && s.sectionId) {
    const found = sectionOf(book, s.sectionId)
    return {
      title: `${s.sectionId} ${found?.section.title ?? ''}`.trim(),
      detail: [found ? pagesLabel(found.section.start_page, found.section.end_page) : null, s.parts > 1 ? `class ${s.part} of ${s.parts}` : null].filter(Boolean).join(' · '),
    }
  }
  if (s.kind === 'chapter_quiz') {
    const ch = book.syllabus.chapters.find((c) => c.number === s.chapter)
    return { title: `Chapter ${s.chapter} quiz and review`, detail: ch?.title ?? '' }
  }
  if (s.kind === 'cancelled') return { title: 'No class', detail: '' }
  return { title: 'Review / flexible', detail: 'Catch up, practice, or go deeper' }
}
