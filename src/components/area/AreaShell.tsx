import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { Role } from '../../lib/roles'
import { useSession } from '../../lib/session'
import { Icon } from '../Icon'
import { NotebookBackground } from '../ui/NotebookBackground'
import { Avatar, type Person } from '../ui/ThreadCard'

export type AreaNavItem = { to: string; label: string; icon: string; end?: boolean }

const VIEWS: { role: Role; label: string; icon: string; to: string; soon?: boolean }[] = [
  { role: 'teacher', label: 'Teacher', icon: 'school', to: '/teacher' },
  { role: 'student', label: 'Student', icon: 'backpack', to: '/student' },
  { role: 'parent', label: 'Parent', icon: 'family_restroom', to: '/parent', soon: true },
]

/** "Demo" badge: everything in the areas is sample data. */
function DemoBadge() {
  return (
    <span
      title="Everything here is sample data"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-note px-2.5 py-1 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B3F0E]"
    >
      <Icon name="science" className="text-[16px]" />
      Demo
    </span>
  )
}

/** "Viewing as: Teacher / Student / Parent". Lets anyone see all three sides of the sample class. */
function ViewingAs({ role, className = '' }: { role: Role; className?: string }) {
  return (
    <nav aria-label="Viewing as" className={`flex items-center gap-2 ${className}`}>
      <span className="hidden font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-navy-soft xl:inline">Viewing as</span>
      <span className="flex flex-1 rounded-full border border-card-line bg-[#F3F7FC] p-1">
        {VIEWS.map((v) => {
          const active = v.role === role
          return (
            <Link
              key={v.role}
              to={v.to}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 font-inter text-[14px] font-semibold transition-colors duration-150 ${
                active ? 'bg-navy text-white' : 'text-navy hover:bg-white'
              }`}
            >
              <span className="hidden sm:inline-flex">
                <Icon name={v.icon} className="text-[18px]" />
              </span>
              {v.label}
              {v.soon && !active && (
                <span className="rounded bg-note px-1 py-px font-mono text-[11px] font-semibold uppercase text-[#6B3F0E]">
                  soon<span className="sr-only">: coming soon</span>
                </span>
              )}
            </Link>
          )
        })}
      </span>
    </nav>
  )
}

type AreaShellProps = {
  role: Role
  person: Person & { title: string }
  nav: AreaNavItem[]
  /** The class name shown in the sidebar and top bar. Empty hides it. */
  classLabel?: string
}

/**
 * Layout for the teacher, student and parent areas: notebook background, a sidebar on desktop,
 * a bottom nav on phones, and a top bar with the class. In the demo it also has a Demo badge and
 * the "Viewing as" switch, so anyone can see all three sides of the sample class.
 */
export function AreaShell({ role, person, nav, classLabel = '' }: AreaShellProps) {
  const { signOut, isDemo } = useSession()
  const navigate = useNavigate()
  const logOut = async () => {
    await signOut()
    navigate('/')
  }
  const navLink = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 items-center gap-3 rounded-xl px-3 font-inter text-[15px] font-semibold transition-colors duration-150 ${
      isActive ? 'bg-navy text-white' : 'text-navy hover:bg-[#EEF4FB]'
    }`

  return (
    <div className="min-h-screen font-inter text-navy antialiased">
      <NotebookBackground />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed bottom-4 left-4 top-4 z-40 hidden w-[248px] flex-col rounded-3xl border border-card-line bg-white p-4 shadow-card lg:flex">
        <Link to="/" className="flex items-center gap-2 px-2 pt-1">
          <img src="/images/logo.svg" alt="" className="h-9 w-auto" />
          <span className="font-grotesk text-[20px] font-extrabold tracking-tight">Compass</span>
        </Link>
        {classLabel && <p className="mt-6 px-3 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-navy-soft">{classLabel}</p>}
        {nav.length > 0 && (
          <nav aria-label="Area" className="mt-3 flex flex-col gap-1">
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLink}>
                <Icon name={item.icon} className="text-[22px]" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
        <div className="mt-auto flex items-center gap-3 rounded-2xl bg-[#F3F7FC] p-3">
          <Avatar person={person} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-inter text-[15px] font-semibold">{person.name}</p>
            <p className="truncate font-inter text-[13px] text-navy-soft">{person.title}</p>
          </div>
          <button type="button" onClick={logOut} aria-label="Log out" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-navy-soft transition-colors hover:bg-white hover:text-navy">
            <Icon name="logout" className="text-[20px]" />
          </button>
        </div>
      </aside>

      <div className="lg:pl-[280px]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-card-line/80 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-3 px-4 md:px-8">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <img src="/images/logo.svg" alt="" className="h-8 w-auto" />
              <span className="font-grotesk text-[19px] font-extrabold tracking-tight">Compass</span>
            </Link>
            {classLabel && <p className="hidden font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-navy-soft lg:block">{classLabel}</p>}
            {isDemo && (
              <div className="ml-auto flex items-center gap-3">
                <DemoBadge />
                <ViewingAs role={role} className="hidden md:flex" />
              </div>
            )}
          </div>
          {isDemo && (
            <div className="border-t border-card-line/80 px-4 py-2 md:hidden">
              <ViewingAs role={role} />
            </div>
          )}
        </header>

        <main id="main" className="mx-auto max-w-[1120px] px-4 pb-32 pt-10 md:px-8 lg:pb-20">
          <Outlet />
        </main>
      </div>

      {/* Phone bottom nav */}
      {nav.length > 0 && (
        <nav aria-label="Area" className="fixed inset-x-0 bottom-0 z-40 border-t border-card-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
          <ul className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex min-h-16 flex-col items-center justify-center gap-0.5 font-inter text-[12px] font-semibold ${isActive ? 'text-accent-strong' : 'text-navy-soft'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-[#FBE1D8]' : ''}`}>
                        <Icon name={item.icon} className="text-[22px]" filled={isActive} />
                      </span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
