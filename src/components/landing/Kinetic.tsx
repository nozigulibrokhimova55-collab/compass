import { useEffect, useRef, type ElementType, type ReactNode } from 'react'
import { gsap } from '../../lib/motion'

/** Hover effects only for a real mouse, and never with reduced motion. */
const HOVER_MOTION = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

/** Splits text into letter spans that a surrounding `Kinetic` heading can move. Words never break apart. */
export function Chars({ text, className = '' }: { text: string; className?: string }) {
  const words = text.split(' ')
  return (
    <>
      {words.map((word, w) => (
        <span key={w}>
          <span className={`inline-block whitespace-nowrap ${className}`}>
            {[...word].map((ch, i) => (
              <span key={i} className="k-char inline-block">
                {ch}
              </span>
            ))}
          </span>
          {w < words.length - 1 && ' '}
        </span>
      ))}
    </>
  )
}

type KineticProps = {
  as?: ElementType
  /** The plain heading text, read by screen readers instead of the split letters. */
  label: string
  children: ReactNode
  className?: string
  id?: string
  /** Letters rise into place when the page loads (hero only). */
  intro?: boolean
  /** Letters near the mouse also turn orange, fading back to navy away from it (hero only). */
  hoverColor?: boolean
}

/**
 * A large headline whose letters react to the mouse, as in the reference: letters near the
 * cursor rise into a smooth bump (about a quarter of the letter height at the peak, fading over
 * roughly three letters each side) and tilt along its curve. They ease back when the cursor leaves.
 */
export function Kinetic({ as: Tag = 'h2', label, children, className = '', id, intro, hoverColor }: KineticProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current!
    const chars = Array.from(el.querySelectorAll<HTMLElement>('.k-char'))
    const ctx = gsap.context(() => {
      if (intro && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.from(chars, { yPercent: 70, opacity: 0, duration: 0.7, stagger: 0.018, ease: 'expo.out', delay: 0.1 })
      }
    }, el)

    if (!window.matchMedia(HOVER_MOTION).matches) return () => ctx.revert()

    const toY = chars.map((c) => gsap.quickTo(c, 'y', { duration: 0.45, ease: 'power3.out' }))
    const toR = chars.map((c) => gsap.quickTo(c, 'rotation', { duration: 0.45, ease: 'power3.out' }))
    let active = false

    const settle = () => {
      if (!active) return
      active = false
      toY.forEach((f) => f(0))
      toR.forEach((f) => f(0))
      if (hoverColor) chars.forEach((c) => (c.style.color = ''))
    }
    const move = (e: PointerEvent) => {
      const size = parseFloat(getComputedStyle(el).fontSize)
      const box = el.getBoundingClientRect()
      const near =
        e.clientX > box.left - size * 0.5 &&
        e.clientX < box.right + size * 0.5 &&
        e.clientY > box.top - size * 0.6 &&
        e.clientY < box.bottom + size * 0.8
      if (!near) return settle()
      active = true
      const sx = size * 0.75
      const sy = size * 0.42
      chars.forEach((c, i) => {
        const r = c.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2)
        const dy = e.clientY - (r.top + r.height / 2)
        const f = Math.exp(-(dx * dx) / (2 * sx * sx)) * Math.exp(-(dy * dy) / (2 * sy * sy))
        toY[i](-0.24 * size * f)
        toR[i](-8 * Math.max(-1.5, Math.min(1.5, dx / sx)) * f)
        // Only the letters right around the cursor go fully orange; the rest stay navy.
        if (hoverColor) c.style.color = `color-mix(in srgb, #E8572A ${Math.round(Math.min(1, f * 1.6) * 100)}%, #161B26)`
      })
    }

    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', settle)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', settle)
      gsap.set(chars, { clearProps: 'transform,color' })
      ctx.revert()
    }
  }, [intro, hoverColor])

  return (
    <Tag ref={ref} id={id} className={className}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">{children}</span>
    </Tag>
  )
}

