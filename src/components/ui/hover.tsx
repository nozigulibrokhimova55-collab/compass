import type { PointerEvent } from 'react'

/**
 * A label that rolls up on hover: the text slides out the top while a copy slides in from below.
 * The parent link needs the `roll-host` class. CSS in index.css runs it only with a real mouse.
 */
export function RollLabel({ children }: { children: string }) {
  return (
    <span className="roll">
      <span>{children}</span>
      <span aria-hidden="true">{children}</span>
    </span>
  )
}

/** Moves the circle's center to the pointer and sets a size big enough to cover the button from there. */
function place(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = e.clientX - r.left
  const y = e.clientY - r.top
  const d = 2 * Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y))
  el.style.setProperty('--fx', `${x}px`)
  el.style.setProperty('--fy', `${y}px`)
  el.style.setProperty('--fd', `${d}px`)
  return el
}

/**
 * Hover handlers for a `fill-host` button: a circle of `--fill` grows from where the mouse enters
 * until it covers the button, and shrinks back toward where it leaves. Mouse only, never touch.
 */
export const fillHover = {
  onPointerEnter: (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') place(e).classList.add('is-filled')
  },
  onPointerLeave: (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') place(e).classList.remove('is-filled')
  },
}
