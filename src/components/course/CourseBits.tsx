import type { Book } from '../../lib/books'
import type { SessionKind } from '../../lib/schedulePlan'
import { Icon } from '../Icon'
import { KIND_LABEL } from './courseGate'

/** "Based on Conceptual Physics by Benjamin Crowell, CC BY-SA 3.0, lightandmatter.com", linked to the source. */
export function BookAttribution({ book, className = '' }: { book: Book; className?: string }) {
  return (
    <p className={`flex items-start gap-2 font-inter text-[14px] leading-6 text-navy-soft ${className}`}>
      <Icon name="menu_book" className="mt-0.5 text-[18px] text-select" />
      <span>
        {book.syllabus.attribution}.{' '}
        <a href={book.syllabus.source} target="_blank" rel="noreferrer" className="font-semibold text-navy underline underline-offset-2 hover:text-accent-strong">
          Source
        </a>
      </span>
    </p>
  )
}

const KIND_STYLE: Record<SessionKind, string> = {
  lesson: 'bg-[#E6F1FD] text-navy',
  chapter_quiz: 'bg-[#FBE1D8] text-[#9C3412]',
  review: 'bg-note text-[#6B3F0E]',
  cancelled: 'bg-[#EEF1F5] text-navy-soft line-through',
}

export function KindBadge({ kind, short = false }: { kind: SessionKind; short?: boolean }) {
  const label = short ? { lesson: 'Lesson', chapter_quiz: 'Quiz', review: 'Review', cancelled: 'Cancelled' }[kind] : KIND_LABEL[kind]
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] ${KIND_STYLE[kind]}`}>{label}</span>
}
