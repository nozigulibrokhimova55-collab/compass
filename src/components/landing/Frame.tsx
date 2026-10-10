import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

type FrameProps = {
  children: ReactNode
  /** Mono tab label, e.g. `lesson_01.intro`. */
  label?: string
  as?: ElementType
  id?: string
  className?: string
  dashed?: boolean
  /** Hide the outline (it draws itself again when shown). Used for selectable cards. */
  show?: boolean
  /** Where the tab label sits: above the top-left corner, or below the bottom-right corner. */
  tabPlacement?: 'top-left' | 'bottom-right'
}

/**
 * A "selected" design-tool frame: thin blue outline, white square corner handles and a
 * blue tab label. The outline draws itself the first time the frame scrolls into view.
 */
export function Frame({ children, label, as: Tag = 'div', id, className = '', dashed, show = true, tabPlacement = 'top-left' }: FrameProps) {
  const ref = useRef<HTMLElement>(null)
  const [seen, setSeen] = useState(() => prefersReducedMotion() || !('IntersectionObserver' in window))

  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [seen])

  const handle = 'sel-handle'
  return (
    <Tag ref={ref} id={id} className={`sel-frame ${dashed ? 'is-dashed' : ''} ${seen && show ? '' : 'is-waiting'} ${className}`}>
      {children}
      <span aria-hidden="true" className="sel-edge top z-[1]" />
      <span aria-hidden="true" className="sel-edge right z-[1]" />
      <span aria-hidden="true" className="sel-edge bottom z-[1]" />
      <span aria-hidden="true" className="sel-edge left z-[1]" />
      <span aria-hidden="true" className={`${handle} -top-[4.5px] -left-[4.5px]`} />
      <span aria-hidden="true" className={`${handle} -top-[4.5px] -right-[4.5px]`} />
      <span aria-hidden="true" className={`${handle} -bottom-[4.5px] -left-[4.5px]`} />
      <span aria-hidden="true" className={`${handle} -bottom-[4.5px] -right-[4.5px]`} />
      {label && (
        <span
          aria-hidden="true"
          className={`sel-tab absolute ${tabPlacement === 'top-left' ? 'bottom-full left-[-1.5px] mb-1' : 'top-full right-[-1.5px] mt-1.5'} whitespace-nowrap rounded-[3px] bg-select px-1.5 py-px font-mono text-[11px] font-semibold leading-4 text-navy`}
        >
          {label}
        </span>
      )}
    </Tag>
  )
}
