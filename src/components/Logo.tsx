import { Link } from 'react-router-dom'

export function Logo({ to = '/', size = 'md' }: { to?: string; size?: 'sm' | 'md' }) {
  return (
    <Link to={to} className="flex items-center gap-space-md rounded-lg">
      <img alt="" className={size === 'sm' ? 'h-7 w-auto' : 'h-9 w-auto'} src="/images/logo.svg" />
      <span
        className={`font-headline-md text-primary tracking-tight ${
          size === 'sm' ? 'text-headline-sm' : 'text-headline-sm md:text-headline-md'
        }`}
      >
        Compass
      </span>
    </Link>
  )
}
