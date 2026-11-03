import type { ReactNode } from 'react'
import { Icon } from '../Icon'

/** Small mono heading between blocks, on a white pill so it reads on the notebook grid. */
export function BlockTitle({ children, id, end }: { children: string; id?: string; end?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="w-fit scroll-mt-24 rounded-full bg-white/85 px-3 py-1 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-navy backdrop-blur-sm">
        {children}
      </h2>
      {end}
    </div>
  )
}

/** Beige "Sample" tag for anything that comes from src/lib/sampleData.ts. */
export function SampleTag({ className = '' }: { className?: string }) {
  return (
    <span
      title="Sample data. This part isn’t connected to your class yet."
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-note px-2.5 py-0.5 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B3F0E] ${className}`}
    >
      <Icon name="science" className="text-[15px]" />
      Sample
    </span>
  )
}

/** A beige line explaining why a section shows sample data. */
export function SampleNote({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-start gap-2 rounded-xl bg-note px-4 py-3 font-inter text-[15px] leading-6 text-navy ${className}`}>
      <span className="mt-0.5 text-[#6B3F0E]">
        <Icon name="science" className="text-[20px]" />
      </span>
      <span>{children}</span>
    </p>
  )
}

export function Loading() {
  return (
    <p role="status" className="pt-24 text-center font-inter text-[15px] text-navy">
      Loading…
    </p>
  )
}
