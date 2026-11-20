import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from '../Icon'

/** A modal card on the native <dialog> element: Escape and a click outside close it, and focus stays inside. */
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      data-lenis-prevent
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-card-line bg-white p-0 text-navy shadow-card backdrop:bg-navy/45"
    >
      {open && (
        <div className="p-5 md:p-7">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="font-grotesk text-[24px] font-extrabold tracking-[-0.01em]">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-[#EEF4FB]">
              <Icon name="close" className="text-[22px]" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
