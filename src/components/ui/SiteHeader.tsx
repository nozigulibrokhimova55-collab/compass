import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { scrollToId } from '../../lib/smoothScroll'
import { Icon } from '../Icon'
import { RollLabel } from './hover'

const LINKS = [
  { id: 'about', label: 'About' },
  { id: 'features', label: 'Features' },
  { id: 'who-are-you', label: 'Who it’s for' },
]

/**
 * Sticky site header. On the landing page every link scrolls smoothly; on other pages the
 * section links go back to the landing page. "Log in" goes to /login; "Sign up" scrolls to
 * "Who are you?" on the landing page and goes to /get-started elsewhere.
 */
export function SiteHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const onLanding = pathname === '/'
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const toSection = (id: string) => (e: MouseEvent) => {
    setOpen(false)
    if (!onLanding) return // Let the link go to /#id.
    e.preventDefault()
    scrollToId(id)
  }
  const toRoles = (e: MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    if (onLanding) scrollToId('who-are-you')
    else navigate('/get-started')
  }

  const href = (id: string) => (onLanding ? `#${id}` : `/#${id}`)

  return (
    <header className="sticky top-0 z-50 border-b border-card-line/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center justify-between gap-3 px-4 md:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2" onClick={() => setOpen(false)}>
          <img src="/images/logo.svg" alt="" className="h-9 w-auto" />
          <span className="font-grotesk text-[20px] font-extrabold tracking-tight text-navy">Compass</span>
        </Link>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={href(l.id)}
              onClick={toSection(l.id)}
              className="roll-host rounded-full px-4 py-2 font-inter text-[15px] font-medium text-navy hover:bg-sky-bottom/40 transition-colors"
            >
              <RollLabel>{l.label}</RollLabel>
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link to="/login" onClick={() => setOpen(false)} className="roll-host rounded-full px-3 py-2 font-inter text-[15px] font-semibold text-navy hover:bg-sky-bottom/40 transition-colors">
            <RollLabel>Log in</RollLabel>
          </Link>
          <a
            href="/get-started"
            onClick={toRoles}
            className="rounded-full px-4 py-2 font-inter text-[15px] font-semibold text-accent-strong hover:bg-accent-strong hover:text-white transition-colors roll-host"
          >
            <RollLabel>Sign up</RollLabel>
          </a>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
            className="md:hidden ml-1 flex h-11 w-11 items-center justify-center rounded-full text-navy hover:bg-sky-bottom/40 cursor-pointer"
          >
            <Icon name={open ? 'close' : 'menu'} className="text-[24px]" />
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Primary" className="md:hidden border-t border-card-line bg-white px-4 py-2 animate-fade-up">
          {LINKS.map((l) => (
            <a key={l.id} href={href(l.id)} onClick={toSection(l.id)} className="block rounded-xl px-3 py-3 font-inter text-[16px] font-medium text-navy">
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}
