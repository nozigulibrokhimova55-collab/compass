import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../Icon'

type ChipProps = {
  children: ReactNode
  icon?: string
  /** Filled navy, for a picked filter or choice. */
  selected?: boolean
  onClick?: () => void
  /** In-app link. */
  to?: string
  /** Plain label with no hover or press (e.g. a feature tag inside a card). */
  static?: boolean
  className?: string
}

const base = 'inline-flex min-h-9 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1 font-inter text-[14px] font-medium leading-5'

/** Outlined pill with an optional icon. A button, a link, or a static tag. */
export function Chip({ children, icon, selected, onClick, to, static: isStatic, className = '' }: ChipProps) {
  const content = (
    <>
      {icon && <Icon name={icon} className="text-[18px]" />}
      {children}
    </>
  )
  if (isStatic) {
    return <span className={`${base} border-navy/25 bg-white text-navy ${className}`}>{content}</span>
  }
  const look = `${base} ${selected ? 'border-navy bg-navy text-white' : 'border-navy bg-white/85 text-navy hover:bg-navy hover:text-white'} cursor-pointer transition-[background-color,color,transform] duration-200 active:scale-[0.96] ${className}`
  if (to) {
    return (
      <Link to={to} className={look}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={look}>
      {content}
    </button>
  )
}
