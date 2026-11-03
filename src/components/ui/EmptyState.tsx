import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import { Button } from './Button'
import { Frame } from './Frame'

type EmptyStateProps = {
  /** Mono tab label, lowercase, e.g. `quizzes.frame`. */
  label: string
  /** Material icon shown in the orange circle. */
  icon: string
  title: string
  children: ReactNode
  /** The one next step. Pass `to` for a link or `onClick` for a button. */
  action?: { label: string; to?: string; onClick?: () => void; icon?: string }
  className?: string
}

/** "Nothing here yet": a friendly line or two and one clear next action. */
export function EmptyState({ label, icon, title, children, action, className = '' }: EmptyStateProps) {
  return (
    <Frame label={label} className={className} bodyClassName="flex h-full flex-col items-start gap-4 p-6 md:p-8">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FBE1D8] text-accent-strong">
        <Icon name={icon} className="text-[26px]" />
      </span>
      <div>
        <h2 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">{title}</h2>
        <div className="mt-2 max-w-prose font-inter text-[16px] leading-7 text-navy-soft">{children}</div>
      </div>
      {action && (
        <Button to={action.to} onClick={action.onClick} variant="navy" icon={action.icon ?? 'arrow_forward'} className="mt-auto">
          {action.label}
        </Button>
      )}
    </Frame>
  )
}
