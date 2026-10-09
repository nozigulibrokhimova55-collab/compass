import type { CSSProperties } from 'react'

type IconProps = {
  name: string
  className?: string
  filled?: boolean
  style?: CSSProperties
}

/** Material Symbols Outlined glyph. Decorative by default. */
export function Icon({ name, className = '', filled, style }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1", ...style } : style}
    >
      {name}
    </span>
  )
}
