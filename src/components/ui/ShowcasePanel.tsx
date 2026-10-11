import { useEffect, useState, type ReactNode } from 'react'
import { prefersReducedMotion } from '../../lib/motion'
import { Selection } from './Selection'
import { useInView } from './useInView'

type ShowcasePanelProps = {
  number: number
  title: string
  /** Second headline line, in orange. */
  highlight: string
  text: ReactNode
  /** Usually a `BrowserWindow`. */
  children: ReactNode
  /** Buttons or chips under the text. */
  actions?: ReactNode
  as?: 'h2' | 'h3'
  className?: string
}

/** White panel with a thin orange selection outline, a number badge, a two-tone title, short text and a mockup on the right. */
export function ShowcasePanel({ number, title, highlight, text, children, actions, as: Heading = 'h3', className = '' }: ShowcasePanelProps) {
  const { ref, seen } = useInView<HTMLElement>()
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    if (!seen) return
    if (prefersReducedMotion()) return setDrawn(true)
    const t = window.setTimeout(() => setDrawn(true), 150)
    return () => window.clearTimeout(t)
  }, [seen])

  return (
    <article ref={ref} className={`reveal ${seen ? 'is-visible' : ''} ${className}`}>
      <div className={`ui-frame relative ${drawn ? 'is-outlined' : ''}`}>
        <div className="grid items-center gap-8 rounded-[28px] bg-white p-6 shadow-card md:grid-cols-[1fr_1.15fr] md:gap-10 md:p-10">
          <div>
            <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-accent-strong px-3 font-mono text-[14px] font-semibold text-white">
              {String(number).padStart(2, '0')}
            </span>
            <Heading className="mt-5 font-grotesk text-[34px] font-black uppercase leading-[0.95] tracking-[-0.035em] text-navy md:text-[48px]">
              {title} <span className="block text-accent">{highlight}</span>
            </Heading>
            <div className="mt-5 font-inter text-[17px] leading-7 text-navy">{text}</div>
            {actions && <div className="mt-7 flex flex-wrap gap-3">{actions}</div>}
          </div>
          <div className="min-w-0">{children}</div>
        </div>
        <Selection tone="orange" />
      </div>
    </article>
  )
}
