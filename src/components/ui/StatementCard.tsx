import type { ReactNode } from 'react'
import { useInView } from './useInView'

type StatementCardProps = {
  /** Headline lines in navy. */
  title: string
  /** Last headline line, in orange. */
  highlight: string
  children: ReactNode
  /** Mono footer row: left and right text. */
  footer?: [string, string]
  as?: 'h2' | 'h3'
  className?: string
}

/** White card with a big orange quote mark, a bold headline ending in orange, grey body text and a mono footer. */
export function StatementCard({ title, highlight, children, footer, as: Heading = 'h3', className = '' }: StatementCardProps) {
  const { ref, seen } = useInView<HTMLElement>()
  return (
    <article ref={ref} className={`reveal ${seen ? 'is-visible' : ''} flex flex-col rounded-3xl border border-card-line bg-white p-7 shadow-card md:p-9 ${className}`}>
      <span aria-hidden="true" className="h-14 font-grotesk text-[96px] font-black leading-[0.9] text-accent">
        “
      </span>
      <Heading className="mt-2 font-grotesk text-[30px] font-extrabold leading-[1.05] tracking-[-0.025em] text-navy md:text-[40px]">
        {title} <span className="block text-accent">{highlight}</span>
      </Heading>
      <div className="mt-5 font-inter text-[17px] leading-7 text-navy-soft">{children}</div>
      {footer && (
        <div className="mt-auto pt-7">
          <div className="flex flex-wrap justify-between gap-2 border-t border-dashed border-card-line pt-4 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-navy-soft">
            <span>{footer[0]}</span>
            <span>{footer[1]}</span>
          </div>
        </div>
      )}
    </article>
  )
}
