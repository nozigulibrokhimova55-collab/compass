import type { MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../Icon'
import { fillHover } from './hover'

export type ButtonVariant = 'orange' | 'navy' | 'outline' | 'soft'

/** Resting look, plus the color of the circle that grows in on hover. */
const VARIANTS: Record<ButtonVariant, string> = {
  orange: 'bg-accent-strong text-white [--fill:#161B26]',
  navy: 'bg-navy text-white [--fill:#C9441A]',
  outline: 'border-2 border-navy bg-white/70 text-navy [--fill:#161B26]',
  soft: 'bg-white/85 text-accent-strong backdrop-blur-sm [--fill:#C9441A]',
}

type ButtonProps = {
  children: ReactNode
  variant?: ButtonVariant
  /** Material icon after the label, e.g. "arrow_forward". */
  icon?: string
  to?: string
  href?: string
  onClick?: (e: MouseEvent<HTMLElement>) => void
  type?: 'button' | 'submit'
  disabled?: boolean
  size?: 'md' | 'lg'
  className?: string
}

/**
 * The site button. On hover (mouse only) a circle grows from where the pointer enters until it
 * fills the button; pressing squeezes it slightly. A router link, a plain link, or a button.
 */
export function Button({ children, variant = 'orange', icon, to, href, onClick, type = 'button', disabled, size = 'md', className = '' }: ButtonProps) {
  const cls = `fill-host inline-flex items-center justify-center gap-2 rounded-xl font-inter font-semibold ${
    size === 'lg' ? 'min-h-[52px] px-7 text-[17px]' : 'min-h-11 px-5 text-[15px]'
  } ${VARIANTS[variant]} disabled:cursor-not-allowed disabled:opacity-50 ${className}`
  const content = (
    <>
      {children}
      {icon && <Icon name={icon} className="text-[20px]" />}
    </>
  )
  if (to) {
    return (
      <Link to={to} onClick={onClick} className={cls} {...fillHover}>
        {content}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} onClick={onClick} className={cls} {...fillHover}>
        {content}
      </a>
    )
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} {...fillHover}>
      {content}
    </button>
  )
}
