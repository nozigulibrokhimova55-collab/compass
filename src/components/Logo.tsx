import { Link } from 'react-router-dom'

export function Logo({ to = '/', size = 'md' }: { to?: string; size?: 'sm' | 'md' }) {
  return (
    <Link to={to} className="flex items-center gap-space-md rounded-lg">
      <img alt="" className={size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'} src="/images/logo.png" />
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
