import type { ReactNode } from 'react'

/** Beige sticky note with a strip of tape, slightly rotated. */
export function StickyNote({ children, tilt = -3, className = '' }: { children: ReactNode; tilt?: number; className?: string }) {
  return (
    <div
      className={`relative inline-block max-w-xs bg-note px-5 pb-4 pt-5 text-left font-inter text-[15px] leading-6 text-navy shadow-[0_10px_24px_-12px_rgba(22,27,38,0.35)] ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <span aria-hidden="true" className="absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rotate-[-4deg] bg-white/70 shadow-sm" />
      {children}
    </div>
  )
}
