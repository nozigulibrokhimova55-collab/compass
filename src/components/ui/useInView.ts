import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

/** True once the element has scrolled into view (right away with reduced motion). Never goes back to false. */
export function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(() => prefersReducedMotion() || typeof IntersectionObserver === 'undefined')

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
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [seen, threshold])

  return { ref, seen }
}
