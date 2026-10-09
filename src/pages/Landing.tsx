import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { useToast } from '../components/Toast'

type Lang = 'en' | 'ko'

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#audiences', label: 'Who it’s for' },
  { href: '#principles', label: 'Principles' },
]

const STEPS = [
  { icon: 'quiz', title: 'Quiz', text: 'Give a short quiz on paper, Google Classroom, Canvas, or Compass.' },
  { icon: 'troubleshoot', title: 'Diagnose', text: 'Wrong answers are grouped by the idea behind them.' },
  { icon: 'event_note', title: 'Plan', text: 'You get a 15-minute review lesson. Nothing goes out until you approve it.' },
  { icon: 'edit_note', title: 'Practice', text: 'Students get two or three short questions aimed at their gap.' },
  { icon: 'check_circle', title: 'Re-check', text: 'A quick follow-up shows whether the idea stuck.' },
  { icon: 'home', title: 'Update home', text: 'Families get a short note in their language with one question to ask at dinner.' },
]

const AUDIENCES = [
  {
    icon: 'school',
    title: 'For teachers',
    points: [
      'Students grouped by misconception, not by score.',
      'Review activities ready for the next class.',
      'Nothing reaches students or parents without your approval.',
    ],
  },
  {
    icon: 'explore',
    title: 'For students',
    points: [
      'Short practice sets instead of long worksheets.',
      'Feedback on how you reasoned, not just a grade.',
      'No leaderboards or class rankings.',
    ],
  },
  {
    icon: 'family_restroom',
    title: 'For parents',
    points: [
      'A weekly note in plain language.',
      'Available in Korean, English, Spanish, and more.',
      'One easy question to talk about at home.',
    ],
  },
]

const PRINCIPLES = [
  { icon: 'verified_user', title: 'Teachers decide', text: 'Compass suggests. The teacher approves every plan and message.' },
  { icon: 'visibility', title: 'Students can see why', text: 'Students can see why an answer was flagged and respond to it.' },
  { icon: 'translate', title: 'Plain language', text: 'Family updates skip test jargon and are translated.' },
  { icon: 'restart_alt', title: 'No permanent labels', text: 'Once a student shows they understand, the flag is cleared.' },
]

const langBtn = (active: boolean) =>
  `px-space-sm py-0.5 rounded-full font-label-sm text-label-sm transition-all ${
    active ? 'bg-primary-container text-on-primary shadow-sm' : 'text-secondary hover:text-primary'
  }`

const container = 'w-full max-w-[1360px] mx-auto px-gutter-mobile md:px-margin-tablet lg:px-margin'
const card = 'bg-surface-container-lowest rounded-2xl border border-[#EED4D7] shadow-xs'

export default function Landing() {
  const [lang, setLang] = useState<Lang>('en')
  const [pushed, setPushed] = useState(false)
  const notify = useToast()

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(102,18,20,0.04)]">
        <div className={`${container} h-16 flex items-center justify-between`}>
          <Logo />
          <nav aria-label="Primary" className="hidden md:flex items-center gap-space-lg">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-on-surface-variant font-label-md text-label-md hover:text-on-surface transition-colors py-space-xs"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-space-md">
            <Link to="/login" className="font-label-md text-label-md text-primary hover:text-tertiary-container transition-colors">
              Sign in
            </Link>
            <Link
              to="/signup"
              className="hidden sm:inline-flex px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-tertiary-container transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full pt-16 bg-background">
        {/* Hero */}
        <section className={`${container} relative pt-space-xl pb-space-xl overflow-hidden`}>
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-secondary-container/40 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto mb-space-xl">
            <div className="flex flex-wrap items-center justify-center gap-space-sm mb-space-md">
              <span className="px-space-sm py-1 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm tracking-widest uppercase">
                For high school science
              </span>
              <div className="inline-flex items-center bg-surface-container-high rounded-full p-0.5">
                <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')} className={langBtn(lang === 'en')}>
                  EN
                </button>
                <button type="button" lang="ko" aria-pressed={lang === 'ko'} onClick={() => setLang('ko')} className={langBtn(lang === 'ko')}>
                  한국어
                </button>
              </div>
            </div>
            {lang === 'en' ? (
              <>
                <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary tracking-tight mb-space-md">
                  Know why students struggle.
                  <br />
                  <span className="italic font-normal text-on-surface">Act on it together.</span>
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mb-space-lg">
                  Compass finds the misunderstanding behind a wrong answer and shows teachers, students, and parents what to do
                  next.
                </p>
              </>
            ) : (
              <div lang="ko">
                <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary tracking-tight mb-space-md">
                  학생이 왜 어려워하는지 알고,
                  <br />
                  <span className="italic font-normal text-on-surface">함께 행동하세요.</span>
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mb-space-lg">
                  컴퍼스는 오답 뒤에 있는 오개념을 찾아 교사, 학생, 학부모에게 다음 단계를 알려 줍니다.
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-space-md w-full sm:w-auto">
              <Link
                to="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-xl py-space-sm rounded-xl bg-primary-container text-on-primary font-title-sm text-title-sm shadow-md hover:bg-tertiary-container hover:-translate-y-0.5 transition-all"
              >
                Get started free
                <Icon name="arrow_forward" className="text-[18px]" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-lg py-space-sm rounded-xl bg-secondary-container text-primary font-title-sm text-title-sm hover:bg-secondary-fixed-dim transition-all"
              >
                How it works
              </a>
            </div>
          </div>

          {/* Preview: one misconception, three views */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-space-md items-stretch">
            <div className={`${card} p-space-lg flex flex-col justify-between gap-space-md`}>
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Teacher view</span>
                <h3 className="font-headline-sm text-headline-sm text-primary mt-1">AP Physics 1, Period 3</h3>
                <div className="mt-space-md p-space-md rounded-xl bg-surface-container-low">
                  <p className="font-body-md text-body-md text-on-surface">
                    <strong>21 of 28 students</strong> think a moving object needs a constant force to keep moving.
                  </p>
                  <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden mt-space-sm">
                    <div className="bg-primary-container h-full rounded-full" style={{ width: '75%' }} />
                  </div>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-md">
                  Suggested: a 5-minute air table demo and a short pair discussion.
                </p>
              </div>
              <button
                type="button"
                disabled={pushed}
                onClick={() => {
                  setPushed(true)
                  notify('Added to tomorrow’s lesson')
                }}
                className={`w-full py-space-xs px-space-md rounded-lg font-label-md text-label-md transition-all flex items-center justify-center gap-1.5 ${
                  pushed ? 'bg-secondary-fixed text-primary' : 'bg-primary-container text-on-primary hover:bg-tertiary-container'
                }`}
              >
                <Icon name={pushed ? 'check_circle' : 'send'} className="text-[16px]" />
                {pushed ? 'Added to tomorrow' : 'Approve for tomorrow'}
              </button>
            </div>

            <div className={`${card} p-space-lg flex flex-col justify-between gap-space-md`}>
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Student view</span>
                <h3 className="font-headline-sm text-headline-sm text-primary mt-1">Quick check, no grade</h3>
                <p className="font-body-md text-body-md text-on-surface mt-space-md">
                  A probe drifts through space with its engines off. What force keeps it moving?
                </p>
                <div className="mt-space-sm space-y-2">
                  <div className="px-space-sm py-1.5 rounded-lg bg-surface-container-low font-body-sm text-body-sm flex justify-between">
                    <span>A) Leftover engine force</span>
                    <Icon name="radio_button_unchecked" className="text-secondary text-[16px]" />
                  </div>
                  <div className="px-space-sm py-1.5 rounded-lg bg-primary-fixed/40 font-body-sm text-body-sm flex justify-between">
                    <span className="font-bold text-primary">B) None. It keeps moving on its own.</span>
                    <Icon name="check_circle" className="text-primary text-[16px]" />
                  </div>
                </div>
              </div>
              <p className="font-body-sm text-body-sm text-on-secondary-container p-space-sm rounded-lg bg-secondary-container/50">
                Minji got it right this time, so the flag is cleared.
              </p>
            </div>

            <div className={`${card} p-space-lg flex flex-col justify-between gap-space-md`}>
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Parent view</span>
                <h3 className="font-headline-sm text-headline-sm text-primary mt-1">Friday note for Minji’s family</h3>
                <p className="font-headline-sm text-headline-sm italic text-on-surface mt-space-md leading-snug">
                  “Ask Minji why an air hockey puck keeps sliding when nobody touches it.”
                </p>
              </div>
              <span className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
                <Icon name="translate" className="text-[16px]" />
                Sent in the family’s language
              </span>
            </div>
          </div>
        </section>

        {/* Score vs Compass */}
        <section className="w-full bg-surface-container-low py-space-xl">
          <div className={container}>
            <div className="text-center max-w-2xl mx-auto mb-space-xl">
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-space-sm">
                A score doesn’t tell the whole story.
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Two students can both get 64% for completely different reasons.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg items-stretch">
              <div className="bg-surface-container-highest rounded-2xl p-space-lg md:p-space-xl">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Usual gradebook</span>
                <div className="flex items-baseline gap-space-sm my-space-sm">
                  <span className="font-display-lg text-display-lg-mobile md:text-display-lg text-error">62%</span>
                  <span className="font-title-sm text-title-sm text-secondary">Grade D</span>
                </div>
                <ul className="space-y-2 font-body-sm text-body-sm text-on-surface-variant">
                  <li className="flex justify-between">
                    <span>Q4 Projectile motion</span>
                    <span className="text-error">-6</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Q7 Momentum</span>
                    <span className="text-error">-8</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Q11 Friction</span>
                    <span className="text-error">-5</span>
                  </li>
                </ul>
                <p className="mt-space-md font-body-sm text-body-sm text-secondary">Shows what was wrong. Not why.</p>
              </div>
              <div className={`${card} p-space-lg md:p-space-xl`}>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">Compass</span>
                <h3 className="font-headline-md text-headline-md text-primary my-space-sm">The gap is vectors, not algebra</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
                  Minji’s algebra is fine. She adds perpendicular vectors as if they were in a line. A 10-minute visual fixes it.
                </p>
                <div className="space-y-space-sm">
                  <div>
                    <div className="flex justify-between font-label-sm text-label-sm mb-1">
                      <span>Algebra</span>
                      <span className="text-[#4F6D54]">Solid</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-container-high">
                      <div className="h-full rounded-full bg-[#4F6D54]" style={{ width: '98%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-label-sm text-label-sm mb-1">
                      <span>Perpendicular vectors</span>
                      <span className="text-[#A4502C]">Needs review</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-container-high">
                      <div className="h-full rounded-full bg-[#C3643B]" style={{ width: '38%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className={`${container} py-space-xl scroll-mt-16`}>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-space-lg">How it works</h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {STEPS.map((s, i) => (
              <li key={s.title} className={`${card} p-space-lg`}>
                <div className="flex items-center justify-between mb-space-sm">
                  <span className="font-headline-md text-headline-md text-primary-container">{String(i + 1).padStart(2, '0')}</span>
                  <Icon name={s.icon} className="text-primary text-[22px]" />
                </div>
                <h3 className="font-title-md text-title-md text-on-surface mb-1">{s.title}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Audiences */}
        <section id="audiences" className="w-full bg-surface-container-low py-space-xl scroll-mt-16">
          <div className={container}>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-space-lg">
              One misconception, three views
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
              {AUDIENCES.map((a) => (
                <div key={a.title} className={`${card} p-space-lg`}>
                  <div className="flex items-center gap-space-sm mb-space-md">
                    <span className="w-10 h-10 rounded-full bg-secondary-container text-primary flex items-center justify-center">
                      <Icon name={a.icon} className="text-[22px]" />
                    </span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">{a.title}</h3>
                  </div>
                  <ul className="space-y-space-sm">
                    {a.points.map((p) => (
                      <li key={p} className="flex gap-space-sm font-body-md text-body-md text-on-surface-variant">
                        <Icon name="check" className="text-primary text-[18px] mt-0.5" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Principles */}
        <section id="principles" className={`${container} py-space-xl scroll-mt-16`}>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-space-lg">Principles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className={`${card} p-space-lg`}>
                <Icon name={p.icon} className="text-primary text-[22px] mb-space-sm" />
                <h3 className="font-title-md text-title-md text-on-surface mb-1">{p.title}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className={`${container} pb-space-xl`}>
          <div className="bg-primary-container rounded-3xl p-space-lg md:p-space-xl text-center text-on-primary relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-tertiary-container/30 blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-xl mx-auto">
              <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-space-sm">Try it with your next quiz.</h2>
              <p className="font-body-lg text-body-lg text-secondary-container mb-space-lg">
                Free for individual teachers. Works with Google Classroom, Canvas, or paper.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-space-md">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-xl py-space-sm rounded-xl bg-secondary-container text-primary font-title-sm text-title-sm hover:bg-surface-bright transition-all"
                >
                  Get started free
                  <Icon name="arrow_forward" className="text-[18px]" />
                </Link>
                <Link
                  to="/app"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-lg py-space-sm rounded-xl bg-tertiary-container text-on-primary font-title-sm text-title-sm hover:bg-tertiary transition-all"
                >
                  See the demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-[#EED4D7]">
        <div className={`${container} py-space-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-space-md`}>
          <Logo size="sm" />
          <p className="font-label-sm text-label-sm text-secondary">Capstone project, Sungkyunkwan University (SKKU). © 2025 Compass.</p>
        </div>
      </footer>
    </>
  )
}
