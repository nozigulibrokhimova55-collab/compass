import { useEffect, useState, type ElementType, type ReactNode } from 'react'
import { prefersReducedMotion } from '../../lib/motion'
import { Selection } from './Selection'
import { useInView } from './useInView'

type FrameProps = {
  children: ReactNode
  /** Mono label on the folder tab, lowercase, e.g. `attendance.frame`. */
  label?: string
  /** Extra content on the right side of the tab row, e.g. a due date. */
  tabEnd?: ReactNode
  tone?: 'white' | 'navy'
  /** Keep the selection outline on (e.g. a picked role card). */
  selected?: boolean
  /** Show the outline on hover and keyboard focus. Defaults to true. */
  hoverable?: boolean
  as?: ElementType
  id?: string
  className?: string
  /** Classes for the card body (padding, layout). */
  bodyClassName?: string
}

/**
 * A card with a folder-style tab label. It slides up the first time it scrolls into view and
 * briefly draws its blue selection outline; after that the outline shows on hover or focus.
 */
export function Frame({
  children,
  label,
  tabEnd,
  tone = 'white',
  selected = false,
  hoverable = true,
  as: Tag = 'div',
  id,
  className = '',
  bodyClassName = 'p-6 md:p-7',
}: FrameProps) {
  const { ref, seen } = useInView<HTMLElement>()
  const [intro, setIntro] = useState(false)

  useEffect(() => {
    if (!seen || prefersReducedMotion()) return
    setIntro(true)
    const t = window.setTimeout(() => setIntro(false), 1500)
    return () => window.clearTimeout(t)
  }, [seen])

  const navy = tone === 'navy'
  const tabColors = navy ? 'bg-navy text-white' : 'bg-white text-navy-soft'
  const cardColors = navy ? 'bg-navy text-white' : 'border border-card-line bg-white text-navy'

  return (
    <Tag ref={ref} id={id} className={`reveal ${seen ? 'is-visible' : ''} ${label ? 'pt-[30px]' : ''} ${className}`}>
      <div className={`ui-frame relative h-full ${selected || intro ? 'is-outlined' : ''} ${hoverable ? 'is-hoverable' : ''}`}>
        {label && (
          <div className="absolute bottom-[calc(100%-1px)] left-0 right-0 z-[1] flex items-end justify-between gap-3">
            <span className={`flex h-[30px] items-center rounded-t-xl px-3.5 font-mono text-[12px] font-medium ${tabColors} ${navy ? '' : 'border border-b-0 border-card-line'}`}>
              {label}
            </span>
            {tabEnd && <span className="pb-1.5">{tabEnd}</span>}
          </div>
        )}
        <div className={`relative h-full rounded-3xl ${label ? 'rounded-tl-none' : ''} shadow-card ${cardColors} ${bodyClassName}`}>{children}</div>
        <Selection />
      </div>
    </Tag>
  )
}
