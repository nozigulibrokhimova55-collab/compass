import Lenis from 'lenis'
import { gsap, ScrollTrigger, prefersReducedMotion } from './motion'

/** Space left above a section when scrolling to it, so the sticky header doesn't cover it. */
const NAV_OFFSET = -72

let lenis: Lenis | null = null

/** Turns on Lenis smooth scrolling (skipped for reduced motion). Returns a cleanup function. */
export function startSmoothScroll() {
  if (prefersReducedMotion()) return () => {}
  const instance = new Lenis({ lerp: 0.1 })
  lenis = instance
  instance.on('scroll', ScrollTrigger.update)
  const tick = (time: number) => instance.raf(time * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return () => {
    gsap.ticker.remove(tick)
    instance.destroy()
    if (lenis === instance) lenis = null
  }
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) {
    lenis.scrollTo(el, { offset: NAV_OFFSET })
    return
  }
  const top = el.getBoundingClientRect().top + window.scrollY + NAV_OFFSET
  window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}
