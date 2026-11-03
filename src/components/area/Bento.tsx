import type { ReactNode } from 'react'

/**
 * The Home overview grid. One column on phones, six on tablets and up.
 * Tiles pick a width with `span` and can stretch down two rows with `tall`.
 */
export function Bento({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-x-5 gap-y-6 md:grid-cols-6 md:auto-rows-min ${className}`}>{children}</div>
}

/** Width out of six columns (tablet and up). Phones always use the full width. */
const SPAN = {
  2: 'md:col-span-3 lg:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-6 lg:col-span-4',
  6: 'md:col-span-6',
} as const

export function BentoItem({ children, span = 3, tall = false, className = '' }: { children: ReactNode; span?: keyof typeof SPAN; tall?: boolean; className?: string }) {
  return <div className={`min-w-0 ${SPAN[span]} ${tall ? 'lg:row-span-2' : ''} ${className}`}>{children}</div>
}
