import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: ReactNode
  description: string
  actions?: ReactNode
}) {
  return (
    <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg mb-space-xl pt-space-lg">
      <div className="flex flex-col gap-space-xs">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">{eyebrow}</span>
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary tracking-tight">{title}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-space-sm">{actions}</div>}
    </section>
  )
}
