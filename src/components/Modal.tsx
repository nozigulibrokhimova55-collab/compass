import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
}

/** Level-3 "diagnostic focus overlay" from the design system. */
export function Modal({ open, onClose, title, eyebrow, children, footer }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prevFocus = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector<HTMLElement>('input, textarea, select, button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prevFocus?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-space-md">
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(59,10,12,0.25)] backdrop-blur-[8px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animate-fade-up relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-surface-container-lowest shadow-[0_24px_48px_-8px_rgba(59,10,12,0.16)]"
      >
        <div className="flex items-start justify-between gap-space-md p-space-lg pb-space-md">
          <div>
            {eyebrow && (
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">{eyebrow}</span>
            )}
            <h2 id={titleId} className="font-headline-md text-headline-md text-primary">
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-container hover:text-primary"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>
        <div className="px-space-lg pb-space-lg">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-space-sm px-space-lg py-space-md bg-surface-container-low rounded-b-3xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
