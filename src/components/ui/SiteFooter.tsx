import type { MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CONTACT_EMAIL } from '../../lib/site'
import { scrollToId } from '../../lib/smoothScroll'
import { Icon } from '../Icon'

type FooterLink = { label: string; to?: string; section?: string; href?: string }

const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: 'Explore',
    links: [
      { label: 'About', section: 'about' },
      { label: 'Features', section: 'features' },
      { label: 'Who it’s for', section: 'who-are-you' },
    ],
  },
  {
    heading: 'Get started',
    links: [
      { label: 'Log in', to: '/login' },
      { label: 'Sign up', to: '/signup' },
      { label: 'Choose your role', to: '/get-started' },
    ],
  },
  {
    heading: 'Info',
    links: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Contact', href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
]

/**
 * Dark navy footer: "footer.frame" tab, contact line, link columns, a huge "Compass" wordmark
 * with an orange C, ruler ticks, and a mono bottom bar.
 */
export function SiteFooter() {
  const onLanding = useLocation().pathname === '/'
  const link = 'font-inter text-[16px] text-white underline-offset-4 hover:underline'

  const toSection = (id: string) => (e: MouseEvent) => {
    if (!onLanding) return
    e.preventDefault()
    scrollToId(id)
  }

  return (
    <footer className="relative mt-[30px] rounded-t-[40px] rounded-tl-none bg-navy text-white">
      <span className="absolute bottom-full left-0 flex h-[30px] items-center rounded-t-xl bg-navy px-4 font-mono text-[12px] text-white">footer.frame</span>
      <div
        className="rounded-t-[40px] rounded-tl-none"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
      >
        <div className="mx-auto w-full max-w-[1240px] px-4 pt-16 md:px-8 md:pt-20">
          <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-accent-soft">Questions, ideas, a class to try it with?</p>
              <p className="mt-4 max-w-xl font-grotesk text-[36px] font-extrabold leading-[1.02] tracking-[-0.03em] md:text-[52px]">Let’s make class a little clearer.</p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="group mt-6 inline-flex items-center gap-2 border-b-2 border-accent pb-1 font-inter text-[18px] font-semibold text-white md:text-[20px]"
              >
                {CONTACT_EMAIL}
                <Icon name="arrow_outward" className="text-[22px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>

            <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {COLUMNS.map((col) => (
                <div key={col.heading}>
                  <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-white/75">{col.heading}</h2>
                  <ul className="mt-4 flex flex-col gap-3">
                    {col.links.map((l) => (
                      <li key={l.label}>
                        {l.section ? (
                          <a href={onLanding ? `#${l.section}` : `/#${l.section}`} onClick={toSection(l.section)} className={link}>
                            {l.label}
                          </a>
                        ) : l.to ? (
                          <Link to={l.to} className={link}>
                            {l.label}
                          </Link>
                        ) : (
                          <a href={l.href} className={link}>
                            {l.label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          {/* Ruler ticks, like the edge of a design canvas. */}
          <div aria-hidden="true" className="mt-16 md:mt-20">
            <div className="flex justify-between font-mono text-[11px] text-white/60">
              {[0, 100, 200, 300, 400, 500, 600, 700, 800].map((n, i) => (
                <span key={n} className={i % 2 ? 'hidden sm:inline' : ''}>
                  {n}
                </span>
              ))}
            </div>
            <div
              className="mt-1 h-3"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, rgba(255,255,255,0.45) 0 1px, transparent 1px 12.5%), repeating-linear-gradient(90deg, rgba(255,255,255,0.22) 0 1px, transparent 1px 1.5625%)',
                backgroundSize: '100% 100%, 100% 50%',
                backgroundRepeat: 'no-repeat',
              }}
            />
          </div>

          <p aria-hidden="true" className="select-none whitespace-nowrap pt-2 pb-[0.14em] text-center font-grotesk text-[23vw] font-black leading-[0.82] tracking-[-0.065em] xl:text-[290px]">
            <span className="text-accent">C</span>ompass
          </p>
        </div>

        <div className="border-t border-white/20">
          <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-3 px-4 py-5 font-mono text-[12px] uppercase tracking-[0.12em] text-white sm:flex-row sm:items-center sm:justify-between md:px-8">
            <span>© 2026 Compass</span>
            <span>A capstone project at Sungkyunkwan University</span>
            <button
              type="button"
              onClick={() => (onLanding ? scrollToId('about') : window.scrollTo({ top: 0, behavior: 'smooth' }))}
              className="w-fit cursor-pointer uppercase underline-offset-4 hover:underline"
            >
              Back to top ↑
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
