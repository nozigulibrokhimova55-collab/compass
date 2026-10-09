import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { ROLE_LABEL } from '../lib/roles'
import { useSession } from '../lib/session'

const NAV = [
  { to: '/app', end: true, icon: 'analytics', label: 'Educator Cockpit' },
  { to: '/app/radar', icon: 'psychology_alt', label: 'Misconception Radar' },
  { to: '/app/reflections', icon: 'auto_stories', label: 'Student Reflections' },
  { to: '/app/family', icon: 'family_restroom', label: 'Parent Narrative Portal' },
  { to: '/app/curriculum', icon: 'menu_book', label: 'Curriculum Map' },
]

const NOTIFICATIONS = [
  { icon: 'warning', text: 'Period 3: 21 of 28 students share the impetus misconception.', time: '12m ago' },
  { icon: 'rate_review', text: 'Marcus Reid’s free response was flagged as an edge case.', time: '1h ago' },
  { icon: 'family_restroom', text: 'Weekly family notes for Period 3 are ready to review.', time: 'Today' },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useSession()
  const navigate = useNavigate()

  return (
    <div className="flex h-full flex-col justify-between py-space-lg px-space-md">
      <div className="flex flex-col gap-space-lg">
        <div className="px-space-sm">
          <Logo to="/" />
        </div>
        <p className="px-space-sm font-label-sm text-label-sm uppercase tracking-wider text-secondary">
          Academic Diagnostics
        </p>
        <nav aria-label="Workspace" className="flex flex-col gap-space-xs">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-space-md px-space-md py-space-sm rounded-lg font-title-sm text-[15px] transition-all ${
                  isActive
                    ? 'bg-primary text-on-primary font-bold shadow-[0_2px_8px_rgba(70,0,5,0.12)]'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`
              }
            >
              <Icon name={item.icon} className="text-[20px]" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-space-sm rounded-xl bg-surface-container flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-full bg-primary flex items-center justify-center">
            <Icon name="person" className="text-on-primary text-[18px]" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-title-sm text-[15px] text-on-surface leading-tight truncate">{user.name}</span>
            <span className="font-label-sm text-label-sm text-secondary">{ROLE_LABEL[user.role]}</span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Sign out"
          title="Sign out"
          onClick={() => {
            signOut()
            navigate('/login')
          }}
          className="p-1 rounded-md text-secondary hover:text-primary transition-colors"
        >
          <Icon name="logout" className="text-[20px]" />
        </button>
      </div>
    </div>
  )
}

function Notifications() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o)
          setUnread(false)
        }}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
      >
        <Icon name="notifications" className="text-[20px]" />
        {unread && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-surface-tint" />}
      </button>
      {open && (
        <div className="animate-fade-up absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-surface-container-lowest p-space-sm shadow-[0_24px_48px_-8px_rgba(59,10,12,0.16)] z-50">
          <p className="px-space-sm py-space-xs font-label-sm text-label-sm uppercase tracking-wider text-secondary">
            Recent signals
          </p>
          <ul>
            {NOTIFICATIONS.map((n) => (
              <li key={n.text} className="flex gap-space-sm p-space-sm rounded-lg hover:bg-surface-container-low">
                <Icon name={n.icon} className="text-[18px] text-primary mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-body-sm text-body-sm text-on-surface">{n.text}</span>
                  <span className="font-label-sm text-label-sm text-secondary">{n.time}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/app/radar?q=${encodeURIComponent(q)}` : '/app/radar')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 h-full w-72 bg-surface-container-low shadow-[0_1px_12px_rgba(102,18,20,0.04)] z-50">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-[rgba(59,10,12,0.25)] backdrop-blur-[8px]"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="animate-fade-up relative h-full w-72 max-w-[85vw] bg-surface-container-low shadow-[0_24px_48px_-8px_rgba(59,10,12,0.16)]">
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface/85 backdrop-blur-md shadow-[0_1px_8px_rgba(102,18,20,0.04)] z-40 flex items-center justify-between gap-space-md px-gutter-mobile md:px-space-lg">
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
            >
              <Icon name="menu" className="text-[22px]" />
            </button>
            <div className="lg:hidden">
              <Logo to="/app" />
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <form role="search" onSubmit={onSearch} className="relative hidden md:block w-72">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline" />
              <input
                aria-label="Search inquiry records and students"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface pl-10 pr-4 py-1.5 rounded-lg text-body-sm font-body-sm border border-outline-variant focus:outline-none focus:border-tertiary-container focus:ring-2 focus:ring-primary/20"
                placeholder="Search inquiry records, students..."
                type="search"
              />
            </form>
            <Notifications />
            <Link
              to="/app/reflections"
              aria-label="Your profile"
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
            >
              <Icon name="person" className="text-on-primary text-[18px]" />
            </Link>
          </div>
        </header>
        <main className="relative pt-16 min-h-screen w-full px-gutter-mobile md:px-margin-tablet lg:px-margin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
