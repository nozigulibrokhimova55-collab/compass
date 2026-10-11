import type { ReactNode } from 'react'
import { Chars, Kinetic } from './Kinetic'
import { StickyNote } from './StickyNote'

type SectionHeaderProps = {
  /** Small handwritten line above the headline, e.g. "first things first". */
  script: string
  /** The headline. It's shown in uppercase; write it in sentence case. */
  title: string
  /** Optional sticky note under the headline. */
  note?: ReactNode
  as?: 'h1' | 'h2'
  id?: string
  align?: 'center' | 'left'
  /** `md` for page tops where a form follows (log in, sign up); `sm` for pages inside the app areas. */
  size?: 'lg' | 'md' | 'sm'
  className?: string
}

const SIZES = {
  lg: 'text-[44px] sm:text-[64px] lg:text-[96px]',
  md: 'text-[44px] sm:text-[56px] lg:text-[72px]',
  sm: 'text-[36px] sm:text-[48px] lg:text-[56px]',
}

/** Orange script line, a huge uppercase headline that reacts to the mouse, and a rotated sticky note. */
export function SectionHeader({ script, title, note, as = 'h2', id, align = 'center', size = 'lg', className = '' }: SectionHeaderProps) {
  const center = align === 'center'
  return (
    <header className={`flex flex-col ${center ? 'items-center text-center' : 'items-start text-left'} ${className}`}>
      <p className="w-fit -rotate-2 rounded-full bg-white/85 px-4 py-0.5 font-hand text-[26px] font-bold leading-9 text-accent-strong backdrop-blur-sm md:text-[30px]">
        {script}
      </p>
      <Kinetic
        as={as}
        id={id}
        label={title}
        className={`mt-4 font-grotesk font-black uppercase leading-[0.92] tracking-[-0.045em] text-navy ${SIZES[size]}`}
      >
        <Chars text={title} />
      </Kinetic>
      {note && <StickyNote className="mt-7">{note}</StickyNote>}
    </header>
  )
}
