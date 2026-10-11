import { useInView } from './useInView'

export type Stat = {
  value: string
  /** Shown in orange after the number, e.g. "%" or "/5". */
  symbol?: string
  label: string
}

type StatCardProps = {
  stats: Stat[]
  /** Small mono heading, e.g. "this week". */
  title?: string
  /** One plain sentence under the numbers. */
  note?: string
  className?: string
}

/** Dark navy card with big white numbers, orange symbols and mono labels. Use real values from sample data only. */
export function StatCard({ stats, title, note, className = '' }: StatCardProps) {
  const { ref, seen } = useInView<HTMLElement>()
  // Three numbers get a smaller size so they never run into each other.
  const three = stats.length > 2
  return (
    <section
      ref={ref}
      aria-label={title}
      className={`reveal ${seen ? 'is-visible' : ''} rounded-3xl bg-navy p-7 text-white shadow-card md:p-8 ${className}`}
      style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
    >
      {title && <h3 className="font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-accent-soft">{title}</h3>}
      <dl className={`grid ${title ? 'mt-5' : ''} ${three ? 'grid-cols-3 gap-4' : 'grid-cols-2 gap-6'}`}>
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse">
            <dt className="mt-2 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-white/80">{s.label}</dt>
            <dd className={`font-grotesk font-black leading-none tracking-[-0.04em] ${three ? 'text-[38px] sm:text-[46px]' : 'text-[48px] md:text-[60px]'}`}>
              {s.value}
              {s.symbol && <span className="text-accent">{s.symbol}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {note && <p className="mt-6 border-t border-white/15 pt-4 font-inter text-[15px] leading-6 text-white/85">{note}</p>}
    </section>
  )
}
