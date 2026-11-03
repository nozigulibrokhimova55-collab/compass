import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { Role } from '../../lib/roles'
import { useSession } from '../../lib/session'
import { Icon } from '../Icon'
import { NotebookBackground } from '../ui/NotebookBackground'
import { Avatar, type Person } from '../ui/ThreadCard'

export type AreaNavItem = { to: string; label: string; icon: string; end?: boolean }

type AreaShellProps = {
  role: Role
  person: Person & { title: string }
  nav: AreaNavItem[]
  /** The class name shown under the logo. Empty hides it. */
  classLabel?: string
}

/** Rounded logo plus wordmark, linking home. */
function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 rounded-lg">
      <img src="/images/logo.svg" alt="" className={small ? 'h-8 w-auto' : 'h-9 w-auto'} />
      <span className={`font-grotesk font-extrabold tracking-tight ${small ? 'text-[19px]' : 'text-[20px]'}`}>Compass</span>
    </Link>
  )
}

/**
 * Layout for the teacher, student and parent areas, on the notebook background.
 * Desktop: a sidebar with the logo, the area's sections, and the person's name with "Log out" at the bottom.
 * Phones: a slim top bar (logo, log out) and a bottom tab bar with the same sections.
 */
export function AreaShell({ role, person, nav, classLabel = '' }: AreaShellProps) {
  const { signOut } = useSession()
  const navigate = useNavigate()
  const logOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen font-inter text-navy antialiased">
      <NotebookBackground />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar, with a folder tab like the frames */}
      <aside className="fixed bottom-4 left-4 top-[46px] z-40 hidden w-[248px] lg:block">
        <span className="absolute bottom-[calc(100%-1px)] left-0 flex h-[30px] items-center rounded-t-xl border border-b-0 border-card-line bg-white px-3.5 font-mono text-[12px] font-medium text-navy-soft">
          {role}.area
        </span>
        <div className="flex h-full flex-col rounded-3xl rounded-tl-none border border-card-line bg-white p-4 shadow-card">
          <div className="px-2 pt-1">
            <Logo />
          </div>
          {classLabel && <p className="mt-6 truncate px-3 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-navy-soft">{classLabel}</p>}
          <nav aria-label="Sections" className={`${classLabel ? 'mt-3' : 'mt-8'} flex flex-col gap-1`}>
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-xl px-3 font-inter text-[15px] font-semibold transition-colors duration-150 ${
                    isActive ? 'bg-navy text-white' : 'text-navy hover:bg-[#EEF4FB]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={item.icon} className={`text-[22px] ${isActive ? 'text-accent-soft' : ''}`} filled={isActive} />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl bg-[#F3F7FC] p-3">
            <div className="flex items-center gap-3">
              <Avatar person={person} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-inter text-[15px] font-semibold">{person.name}</p>
                <p className="truncate font-inter text-[13px] text-navy-soft">{person.title}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logOut}
              className="mt-3 flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-card-line bg-white font-inter text-[14px] font-semibold text-navy transition-colors hover:border-navy"
            >
              <Icon name="logout" className="text-[18px]" />
              Log out
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[280px]">
        {/* Phone and tablet top bar */}
        <header className="sticky top-0 z-30 border-b border-card-line/80 bg-white/90 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-3 px-4 md:px-8">
            <Logo small />
            <div className="ml-auto flex min-w-0 items-center gap-2">
              <Avatar person={person} size="sm" />
              <span className="sr-only">Signed in as {person.name}</span>
              <button
                type="button"
                onClick={logOut}
                aria-label="Log out"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-navy transition-colors hover:bg-[#EEF4FB]"
              >
                <Icon name="logout" className="text-[22px]" />
              </button>
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-[1120px] px-4 pb-32 pt-8 md:px-8 lg:pb-20 lg:pt-12">
          <Outlet />
        </main>
      </div>

      {/* Phone and tablet bottom tab bar */}
      <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-40 border-t border-card-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-0.5 px-0.5 font-inter text-[12px] font-semibold ${isActive ? 'text-accent-strong' : 'text-navy-soft'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-[#FBE1D8]' : ''}`}>
                      <Icon name={item.icon} className="text-[22px]" filled={isActive} />
                    </span>
                    <span className="max-w-full truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
