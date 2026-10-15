import type { ReactNode } from 'react'
import { Frame } from './Frame'

type PageNoticeProps = {
  /** Mono tab label, lowercase, e.g. `error.frame`. */
  label: string
  title: string
  children?: ReactNode
  /** Announce right away (for errors). */
  alert?: boolean
}

/** A small card for "loading failed", "no class yet" and other states where there is nothing else to show. */
export function PageNotice({ label, title, children, alert = false }: PageNoticeProps) {
  return (
    <Frame label={label} className="mt-10 max-w-xl" bodyClassName="p-6 md:p-8">
      <div role={alert ? 'alert' : undefined}>
        <h2 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">{title}</h2>
        {children && <div className="mt-2 font-inter text-[16px] leading-7 text-navy-soft">{children}</div>}
      </div>
    </Frame>
  )
}
