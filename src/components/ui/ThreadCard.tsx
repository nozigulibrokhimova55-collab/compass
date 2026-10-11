import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import { useInView } from './useInView'

export type Person = { name: string; initials: string; tone?: 'orange' | 'blue' | 'beige' }

export type ThreadItem =
  | { kind: 'divider'; label: string }
  | { kind: 'message'; from: Person; time: string; text: string; files?: { name: string; icon?: string }[]; mine?: boolean }

const AVATAR: Record<NonNullable<Person['tone']>, string> = {
  orange: 'bg-[#FBD9CC] text-navy',
  blue: 'bg-sky-bottom text-navy',
  beige: 'bg-note text-navy',
}

export function Avatar({ person, size = 'md' }: { person: Person; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-inter font-bold ring-2 ring-white ${AVATAR[person.tone ?? 'blue']} ${
        size === 'sm' ? 'h-8 w-8 text-[12px]' : 'h-10 w-10 text-[14px]'
      }`}
    >
      {person.initials}
    </span>
  )
}

type ThreadCardProps = {
  title: string
  /** Mono line under the title, e.g. "Physics 1 · Minji Kim". */
  subtitle?: string
  people: Person[]
  items: ThreadItem[]
  /** Reply box or other actions under the thread. */
  footer?: ReactNode
  /** Extra controls on the right of the header (e.g. a language switcher). */
  headerEnd?: ReactNode
  className?: string
}

/** Chat-style card: header with avatars, messages with times and file chips, and orange mono dividers. */
export function ThreadCard({ title, subtitle, people, items, footer, headerEnd, className = '' }: ThreadCardProps) {
  const { ref, seen } = useInView<HTMLElement>()
  return (
    <section ref={ref} aria-label={title} className={`reveal ${seen ? 'is-visible' : ''} overflow-hidden rounded-3xl border border-card-line bg-white shadow-card ${className}`}>
      <header className="flex flex-wrap items-center gap-3 border-b border-card-line px-5 py-4 md:px-7">
        <div className="flex -space-x-2">
          {people.map((p) => (
            <Avatar key={p.name} person={p} size="sm" />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-grotesk text-[18px] font-extrabold leading-6 tracking-[-0.01em] text-navy">{title}</h3>
          {subtitle && <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-navy-soft">{subtitle}</p>}
        </div>
        {headerEnd}
      </header>

      <ol className="flex flex-col gap-5 px-5 py-6 md:px-7">
        {items.map((item, i) =>
          item.kind === 'divider' ? (
            <li key={i} className="flex items-center gap-3 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-accent-strong">
              <span aria-hidden="true" className="h-px flex-1 border-t border-dashed border-accent/50" />
              {item.label}
              <span aria-hidden="true" className="h-px flex-1 border-t border-dashed border-accent/50" />
            </li>
          ) : (
            <li key={i} className={`flex gap-3 ${item.mine ? 'flex-row-reverse text-right' : ''}`}>
              <Avatar person={item.from} />
              <div className={`min-w-0 max-w-[85%] ${item.mine ? 'items-end' : ''} flex flex-col`}>
                <p className="font-inter text-[14px] leading-5">
                  <span className="font-semibold text-navy">{item.from.name}</span>
                  <span className="ml-2 font-mono text-[12px] text-navy-soft">{item.time}</span>
                </p>
                <p className={`mt-1.5 rounded-2xl px-4 py-3 text-left font-inter text-[16px] leading-6 text-navy ${item.mine ? 'rounded-tr-md bg-[#E3EEFA]' : 'rounded-tl-md bg-[#F4F7FB]'}`}>
                  {item.text}
                </p>
                {item.files && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.files.map((f) => (
                      <span key={f.name} className="inline-flex items-center gap-1.5 rounded-lg border border-card-line bg-white px-2.5 py-1.5 font-mono text-[12px] text-navy">
                        <Icon name={f.icon ?? 'description'} className="text-[16px] text-select" />
                        {f.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ),
        )}
      </ol>

      {footer && <div className="border-t border-card-line bg-[#F8FAFD] px-5 py-4 md:px-7">{footer}</div>}
    </section>
  )
}
