import { Link, useLocation } from 'react-router-dom'
import { CONTACT_EMAIL } from '../../lib/site'
import { scrollToId } from '../../lib/smoothScroll'

/** Navy footer with rounded top corners and a faint dot grid. */
export function SiteFooter() {
  const onLanding = useLocation().pathname === '/'
  const link = 'font-inter text-[15px] text-white underline-offset-4 hover:underline'

  return (
    <footer
      className="rounded-t-[32px] bg-navy text-white"
      style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
    >
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-10 px-4 py-14 md:flex-row md:items-start md:justify-between md:px-8">
        <div className="max-w-sm">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
              <img src="/images/logo.svg" alt="" className="h-8 w-auto" />
            </span>
            <span className="font-grotesk text-[20px] font-extrabold tracking-tight">Compass</span>
          </Link>
          <p className="mt-4 font-inter text-[16px] leading-[26px] text-white">Helping teachers, students, and parents get on the same page.</p>
        </div>

        <nav aria-label="Footer" className="flex gap-8">
          <a
            href={onLanding ? '#about' : '/#about'}
            onClick={(e) => {
              if (!onLanding) return
              e.preventDefault()
              scrollToId('about')
            }}
            className={link}
          >
            About
          </a>
          <Link to="/privacy" className={link}>
            Privacy
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
            Contact
          </a>
        </nav>
      </div>
      <div className="border-t border-white/25">
        <p className="mx-auto w-full max-w-[1240px] px-4 py-5 font-mono text-[13px] uppercase tracking-[0.12em] text-white md:px-8">
          A capstone project at Sungkyunkwan University
        </p>
      </div>
    </footer>
  )
}
