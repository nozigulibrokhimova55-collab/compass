import type { CSSProperties } from 'react'

/** Cloud placement: vertical position, width, drift duration, and a negative delay to spread them out. */
const CLOUDS = [
  { top: '6%', w: 460, dur: 260, at: 0.15, o: 0.95 },
  { top: '18%', w: 300, dur: 210, at: 0.62, o: 0.8 },
  { top: '34%', w: 520, dur: 300, at: 0.38, o: 0.9 },
  { top: '52%', w: 340, dur: 230, at: 0.85, o: 0.75 },
  { top: '64%', w: 600, dur: 320, at: 0.05, o: 0.9 },
  { top: '80%', w: 380, dur: 250, at: 0.5, o: 0.85 },
  { top: '90%', w: 520, dur: 280, at: 0.72, o: 0.95 },
]

/** Fixed sky gradient with slowly drifting clouds. Decorative only. */
export function SkyBackground() {
  return (
    <div className="sky-bg" aria-hidden="true">
      {CLOUDS.map((c, i) => (
        <span
          key={i}
          className="cloud"
          style={
            {
              top: c.top,
              '--w': `${c.w}px`,
              '--o': c.o,
              '--dur': `${c.dur}s`,
              '--delay': `${-c.dur * c.at}s`,
              // Resting position when motion is reduced.
              '--x': `${c.at * 100}vw`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
