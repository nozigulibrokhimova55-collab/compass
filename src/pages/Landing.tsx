import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/Toast'

type Lang = 'en' | 'ko'

const NAV_LINKS = [
  { href: '#overview', label: 'Overview' },
  { href: '#continuum', label: 'Pedagogy & Model' },
  { href: '#parent-narratives', label: 'Parent Narratives' },
  { href: '#get-started', label: 'Admissions & Inquiry' },
]

const langBtn = (active: boolean) =>
  `px-space-sm py-0.5 rounded-full font-label-sm text-label-sm transition-all ${
    active ? 'bg-primary-container text-on-primary shadow-sm' : 'text-secondary hover:text-primary'
  }`

export default function Landing() {
  const [lang, setLang] = useState<Lang>('en')
  const [pushed, setPushed] = useState(false)
  const notify = useToast()

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 bg-surface/85 backdrop-blur-md shadow-[0_1px_8px_rgba(102,18,20,0.04)]">
        <div className="h-16 w-full px-gutter-mobile md:px-margin-tablet lg:px-margin max-w-[1360px] mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-space-md">
            <img alt="" className="h-8 w-auto object-contain" src="/images/logo.png" />
            <span className="font-headline-md text-headline-sm md:text-headline-md text-primary tracking-tight">
              Compass
            </span>
          </Link>
          <nav aria-label="Primary" className="hidden md:flex items-center gap-space-lg">
            {NAV_LINKS.map((l) => (
              <a key={l.href} className="text-on-surface-variant font-label-md text-label-md hover:text-on-surface transition-colors py-space-xs" href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-space-md">
            <Link className="hidden sm:inline-block font-label-md text-label-md text-primary hover:text-tertiary-container transition-colors" to="/login">
              Sign In
            </Link>
            <Link to="/app" aria-label="Open workspace" className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </Link>
          </div>
        </div>
      </header>
      <main className="w-full pt-16 bg-background min-h-screen">
        <div className="flex flex-col w-full">
          {/* Interactive Language State Controller Script */}
          {/* Section 1: Hero Section */}
          <section id="overview" className="relative w-full max-w-[1360px] mx-auto px-gutter-mobile md:px-margin-tablet lg:px-margin pt-space-xl pb-space-xl overflow-hidden scroll-mt-16">
            {/* Atmospheric background warmth */}
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-secondary-container/40 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute top-1/2 -left-40 w-80 h-80 bg-primary-fixed/20 rounded-full blur-2xl pointer-events-none"></div>
            <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto mb-space-xl">
              {/* Language Pill Switcher & Eyebrow */}
              <div className="flex flex-wrap items-center justify-center gap-space-sm mb-space-md">
                <span className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm tracking-widest uppercase">
                  <span className="w-2 h-2 rounded-full bg-surface-tint animate-pulse"></span>
                  AI-Powered Conceptual Diagnostics for High School Science
                </span>
                <div className="inline-flex items-center bg-surface-container-high rounded-full p-0.5 border-0 shadow-inner">
                  <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')} className={langBtn(lang === 'en')}>
                    EN
                  </button>
                  <button type="button" lang="ko" aria-pressed={lang === 'ko'} onClick={() => setLang('ko')} className={langBtn(lang === 'ko')}>
                    한국어
                  </button>
                </div>
              </div>
              {/* Main Headline */}
              {lang === 'en' ? (
                <>
                  <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary tracking-tight mb-space-md max-w-3xl leading-tight">
                    Know why students struggle.
                    <br />
                    <span className="italic font-normal text-on-surface">Act on it together.</span>
                  </h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-space-lg leading-relaxed">
                    Compass pinpoints the mental models behind mistakes. Teachers, students, and parents get clear next steps without test anxiety.
                  </p>
                </>
              ) : (
                <div lang="ko">
                  <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary tracking-tight mb-space-md max-w-3xl leading-tight">
                    학생이 왜 어려워하는지 알고,
                    <br />
                    <span className="italic font-normal text-on-surface">함께 행동하세요.</span>
                  </h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-space-lg leading-relaxed">
                    컴퍼스는 단순 점수 대신 오답 뒤의 개념적 원인을 찾아 교사, 학생, 학부모가 함께 성장하도록 돕습니다.
                  </p>
                </div>
              )}
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-space-md w-full sm:w-auto">
                <Link className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-xl py-space-sm rounded-xl bg-primary-container text-on-primary font-title-sm text-title-sm shadow-md hover:bg-tertiary-container hover:-translate-y-0.5 transition-all" to="/signup">
                  <span>
                    Get Started Free
                  </span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </Link>
                <a className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-lg py-space-sm rounded-xl bg-secondary-container text-primary font-title-sm text-title-sm shadow-sm hover:bg-surface-container-high transition-all" href="#continuum">
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    play_circle
                  </span>
                  <span>
                    See How It Works
                  </span>
                </a>
              </div>
            </div>
            {/* 3-Tier Interconnected Diagnostic Preview Canvas */}
            <div className="relative z-10 w-full mt-space-md" id="interactive-preview">
              {/* Section overline badge */}
              <div className="flex items-center justify-between mb-space-sm px-space-sm text-secondary">
                <div className="flex items-center gap-2 font-label-md text-label-md">
                  <span aria-hidden="true" className="material-symbols-outlined text-primary text-[20px]">
                    hub
                  </span>
                  <span className="uppercase tracking-wider">
                    Synchronized Classroom Flow: Period 3 AP Physics
                  </span>
                </div>
                <span className="font-label-sm text-label-sm bg-surface-container-high px-space-sm py-0.5 rounded-full text-secondary">
                  Live System Simulation
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-stretch">
                {/* Card 1: Teacher Diagnostic & Remediation Card (5 cols) */}
                <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-space-lg shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-space-md">
                      <span className="px-space-sm py-1 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm">
                        Teacher Action Portal
                      </span>
                      <span className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-surface-tint">
                          sensors
                        </span>
                        28 Submissions
                      </span>
                    </div>
                    <div className="flex items-center gap-space-sm mb-space-sm">
                      <span className="w-3 h-3 rounded-full bg-surface-tint"></span>
                      <h3 className="font-headline-sm text-headline-sm text-primary">
                        AP Physics 1 · Period 3
                      </h3>
                    </div>
                    <div className="p-space-md rounded-xl bg-surface-container-low mb-space-md">
                      <div className="flex justify-between items-start mb-space-xs">
                        <span className="font-label-md text-label-md text-primary font-bold">
                          Identified Mental Model Flaw:
                        </span>
                        <span className="font-label-sm text-label-sm text-surface-tint font-bold">
                          75% of class
                        </span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface mb-space-xs">
                        <strong>
                          Aristotelian Impetus Flaw
                        </strong>
                        : 21 students assumed constant velocity requires continuous force in vacuum space.
                      </p>
                      <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden my-space-xs">
                        <div className="bg-primary-container h-full rounded-full" style={{ width: "75%" }}></div>
                      </div>
                      <span className="font-label-sm text-label-sm text-secondary">
                        Root Misconception Index: Newton's 1st Law vs Everyday Friction
                      </span>
                    </div>
                  </div>
                  <div className="pt-space-md bg-surface-container-low/50 -mx-space-lg -mb-space-lg p-space-lg rounded-b-2xl">
                    <div className="flex items-center justify-between mb-space-sm">
                      <span className="font-label-sm text-label-sm text-secondary uppercase font-bold">
                        Automated 15-Min Remediation
                      </span>
                      <span className="font-label-sm text-label-sm text-primary flex items-center gap-0.5">
                        <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                          check_circle
                        </span>
                        Ready to Deploy
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                      5-minute PhET frictionless puck demo paired with Socratic counter-example prompt on deep space voyager probes.
                    </p>
                    <button
                      type="button"
                      disabled={pushed}
                      onClick={() => {
                        setPushed(true)
                        notify('Remediation pushed to tomorrow’s 9:00 AM lesson')
                      }}
                      className={`w-full py-space-xs px-space-md rounded-lg font-label-md text-label-md transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                        pushed ? 'bg-secondary-fixed text-primary' : 'bg-primary-container text-on-primary hover:bg-tertiary-container'
                      }`}
                    >
                      <span>{pushed ? 'Pushed to Tomorrow’s Lesson' : 'Approve & Push to Tomorrow’s Lesson'}</span>
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                        {pushed ? 'check_circle' : 'send'}
                      </span>
                    </button>
                  </div>
                </div>
                {/* Connector Indicator Desktop */}
                <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl p-space-lg shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-space-md">
                      <span className="px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                        Student Reflection Check
                      </span>
                      <span className="font-label-sm text-label-sm text-secondary">
                        Minji Kim (Grade 11)
                      </span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-primary mb-space-xs">
                      Targeted Micro-Inquiry
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                      Diagnostic check (No grades, zero peer ranking. Pure conceptual exploration):
                    </p>
                    <div className="p-space-md rounded-xl bg-surface-container-low mb-space-sm">
                      <span className="font-label-sm text-label-sm text-surface-tint font-bold uppercase tracking-wide block mb-1">
                        Concept Pulse 2 of 3
                      </span>
                      <p className="font-body-md text-body-md text-on-surface mb-space-sm">
                        "A probe is drifting between Earth and Mars at 12,000 km/h with its thrusters turned OFF. What net force acts along its direction of travel?"
                      </p>
                      {/* Choice options */}
                      <div className="space-y-2">
                        <div className="p-space-xs px-space-sm rounded-lg bg-surface-container-lowest text-on-surface font-body-sm text-body-sm flex items-center justify-between shadow-xs">
                          <span>
                            A) Equal to the remaining fuel pressure
                          </span>
                          <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[16px]">
                            radio_button_unchecked
                          </span>
                        </div>
                        <div className="p-space-xs px-space-sm rounded-lg bg-primary-fixed/40 text-on-surface font-body-sm text-body-sm flex items-center justify-between shadow-xs">
                          <span className="font-bold text-primary">
                            B) Exactly Zero Net Force (Inertia)
                          </span>
                          <span aria-hidden="true" className="material-symbols-outlined text-primary text-[18px]">
                            check_circle
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-space-md rounded-xl bg-secondary-container/50">
                    <div className="flex items-center gap-2 text-primary font-label-sm text-label-sm mb-1">
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                        lightbulb
                      </span>
                      <span className="font-bold">
                        Mindset Shift Detected:
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-secondary-container">
                      Minji decoupled constant speed from constant engine force. Misconception resolved without punitive grading stress.
                    </p>
                  </div>
                </div>
                {/* Card 3: Parent Dinner Prompt (3 cols) */}
                <div className="lg:col-span-3 bg-surface-container-lowest rounded-2xl p-space-lg shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-space-md">
                      <span className="px-space-sm py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm">
                        Weekly Parent Note
                      </span>
                      <span className="font-label-sm text-label-sm text-secondary">
                        Every Friday
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-space-xs">
                      <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold text-sm">
                        MK
                      </div>
                      <div>
                        <p className="font-title-sm text-title-sm text-primary leading-none">
                          For Minji's Family
                        </p>
                        <p className="font-label-sm text-label-sm text-secondary">
                          Plain-Language Summary
                        </p>
                      </div>
                    </div>
                    <div className="my-space-md p-space-md rounded-xl bg-surface-container-low">
                      <span className="font-label-sm text-label-sm text-surface-tint font-bold tracking-wide uppercase block mb-1">
                        Suggested Dinner Prompt
                      </span>
                      <p className="font-headline-sm text-headline-sm text-on-surface italic mb-space-xs leading-snug">
                        "Ask Minji what keeps an air hockey puck sliding across the table when no one is touching it."
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Zero jargon. No score shaming. Just a 2-minute dialogue celebrating curiosity.
                      </p>
                    </div>
                  </div>
                  <div className="p-space-sm rounded-lg bg-surface-container-highest text-secondary font-label-sm text-label-sm flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                        translate
                      </span>
                      <span>
                        Available in 한국어 & 14 langs
                      </span>
                    </span>
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                      chat_bubble_outline
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* Section 2: Problem vs Solution (Editorial Contrast) */}
          <section className="w-full bg-surface-container-low py-space-xl">
            <div className="max-w-[1360px] mx-auto px-gutter-mobile md:px-margin-tablet lg:px-margin">
              <div className="text-center max-w-3xl mx-auto mb-space-xl">
                <span className="font-label-md text-label-md uppercase tracking-widest text-surface-tint font-bold block mb-space-xs">
                  The Assessment Dilemma
                </span>
                <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-space-md">
                  A score doesn't tell the whole story.
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  When high schoolers receive an arbitrary percentage, it signals inadequacy instead of insight. Two students with a 64% often possess completely opposite cognitive gaps.
                </p>
              </div>
              {/* Comparison Showcase Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg items-stretch mb-space-xl">
                {/* Conventional Opaque Approach */}
                <div className="bg-surface-container-highest rounded-2xl p-space-xl shadow-xs flex flex-col justify-between opacity-90">
                  <div>
                    <div className="flex items-center justify-between mb-space-md">
                      <span className="px-space-sm py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                        Conventional Grade Book
                      </span>
                      <span className="font-label-sm text-label-sm text-secondary">
                        The Anxious Status Quo
                      </span>
                    </div>
                    <div className="flex items-baseline gap-space-sm mb-space-sm">
                      <span className="font-display-lg text-display-lg-mobile md:text-display-lg text-error font-bold tracking-tight">
                        62%
                      </span>
                      <span className="font-title-sm text-title-sm text-secondary">
                        Grade: D- · Rank: 24/28
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
                      Teacher records a punitive numerical deficit. The student feels panic and closes their textbook. The parent sees red ink and demands punitive screen-time curfews without understanding what failed.
                    </p>
                    {/* Diagnostic blindness visual */}
                    <div className="p-space-md rounded-xl bg-surface-container-lowest/80 space-y-2 text-on-surface">
                      <div className="flex justify-between items-center text-sm py-1">
                        <span className="text-secondary line-through">
                          Q4. Projectile Motion
                        </span>
                        <span className="text-error font-bold">
                          -6 pts
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm py-1">
                        <span className="text-secondary line-through">
                          Q7. Momentum Transfer
                        </span>
                        <span className="text-error font-bold">
                          -8 pts
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm py-1">
                        <span className="text-secondary line-through">
                          Q11. Friction & Drag
                        </span>
                        <span className="text-error font-bold">
                          -5 pts
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-space-lg pt-space-md flex items-center gap-2 text-secondary font-label-sm text-label-sm">
                    <span aria-hidden="true" className="material-symbols-outlined text-error text-[18px]">
                      cancel
                    </span>
                    <span>
                      Outcome: Anxiety, defensive posturing, zero actionable recovery path.
                    </span>
                  </div>
                </div>
                {/* Compass Diagnostic Precision */}
                <div className="bg-surface-container-lowest rounded-2xl p-space-xl shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-space-md">
                      <span className="px-space-sm py-1 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm font-bold">
                        Compass Cognitive Diagnostic
                      </span>
                      <span className="font-label-sm text-label-sm text-primary font-bold">
                        Root Inquiry System
                      </span>
                    </div>
                    <div className="flex items-baseline gap-space-sm mb-space-sm">
                      <span className="font-display-lg text-display-lg text-primary font-bold tracking-tight">
                        Diagnostic Map
                      </span>
                      <span className="font-title-sm text-title-sm text-secondary">
                        Vector Intuition vs Calculation
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface mb-space-lg">
                      Compass dissects the error signature: Minji's algebra is flawless (100%), but she treats perpendicular vectors as sequential addition. One targeted 10-minute visual model clears the obstruction.
                    </p>
                    {/* Cognitive dissection visual */}
                    <div className="p-space-md rounded-xl bg-surface-container-low space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-label-md text-on-surface">
                          Algebraic Manipulation
                        </span>
                        <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-bold">
                          Mastered (98%)
                        </span>
                      </div>
                      <div className="w-full bg-surface-container-highest rounded-full h-1.5">
                        <div className="bg-primary-container h-full rounded-full" style={{ width: "98%" }}></div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-label-md text-label-md text-primary font-bold">
                          Orthogonal Vector Separation
                        </span>
                        <span className="px-space-xs py-0.5 rounded bg-secondary-container text-surface-tint font-label-sm text-label-sm font-bold">
                          Misconception Isolated
                        </span>
                      </div>
                      <div className="w-full bg-surface-container-highest rounded-full h-1.5">
                        <div className="bg-surface-tint h-full rounded-full" style={{ width: "38%" }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-space-lg pt-space-md flex items-center gap-2 text-primary font-label-sm text-label-sm">
                    <span aria-hidden="true" className="material-symbols-outlined text-primary text-[18px]">
                      verified
                    </span>
                    <span>
                      Outcome: Targeted remediation, relieved student, informed household conversation.
                    </span>
                  </div>
                </div>
              </div>
              {/* 3 Core Diagnostic Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs">
                  <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center text-primary mb-space-md">
                    <span aria-hidden="true" className="material-symbols-outlined">
                      psychology
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-primary mb-space-xs">
                    Concealed Reasoning
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Traditional grades lump calculation slips and deep physical misconceptions into the same negative sum. Compass exposes the mental architecture behind each click.
                  </p>
                </div>
                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs">
                  <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center text-primary mb-space-md">
                    <span aria-hidden="true" className="material-symbols-outlined">
                      alt_route
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-primary mb-space-xs">
                    Differentiated Pathways
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    A student failing due to terminology requires an entirely different intervention than one struggling with spatial coordinate frames. We tailor the exact antidote.
                  </p>
                </div>
                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs">
                  <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center text-primary mb-space-md">
                    <span aria-hidden="true" className="material-symbols-outlined">
                      forum
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-primary mb-space-xs">
                    Empathy at Home
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    We transform defensive high-school grade anxieties into warm, authentic curiosity. Parents receive zero confusing jargon—just practical dinner conversation seeds.
                  </p>
                </div>
              </div>
            </div>
          </section>
          {/* Section 3: The 6-Step Continuum */}
          <section className="w-full max-w-[1360px] mx-auto px-gutter-mobile md:px-margin-tablet lg:px-margin py-space-xl scroll-mt-16" id="continuum">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl gap-space-md">
              <div>
                <span className="font-label-md text-label-md uppercase tracking-widest text-surface-tint font-bold block mb-space-xs">
                  Pedagogical Architecture
                </span>
                <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
                  The 6-Step Diagnostic Continuum
                </h2>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                A continuous, respectful loop keeping educator agency first, student stress low, and families thoughtfully aligned.
              </p>
            </div>
            {/* Editorial Steps Mosaic */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
              {/* Step 01 */}
              <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-md">
                    <span className="font-headline-sm text-headline-sm text-secondary font-bold">
                      01
                    </span>
                    <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[24px]">
                      assignment_turned_in
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-primary mb-space-xs">
                    Assess Intention
                  </h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Administer short 5-minute conceptual checkpoints on paper, Google Classroom, Canvas, or Compass web interfaces.
                  </p>
                </div>
                <div className="mt-space-lg pt-space-xs text-secondary font-label-sm text-label-sm uppercase tracking-wide">
                  Input Layer · 5 Mins
                </div>
              </div>
              {/* Step 02 */}
              <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-md">
                    <span className="font-headline-sm text-headline-sm text-primary font-bold">
                      02
                    </span>
                    <span aria-hidden="true" className="material-symbols-outlined text-surface-tint text-[24px]">
                      troubleshoot
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-primary mb-space-xs">
                    Diagnose Root Flaw
                  </h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Compass AI aggregates wrong answers into cognitive categories (e.g., Pre-Newtonian Impetus, Centripetal Misdirection).
                  </p>
                </div>
                <div className="mt-space-lg pt-space-xs text-surface-tint font-label-sm text-label-sm uppercase tracking-wide font-bold">
                  Pattern Analysis · Automated
                </div>
              </div>
              {/* Step 03 */}
              <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-md">
                    <span className="font-headline-sm text-headline-sm text-secondary font-bold">
                      03
                    </span>
                    <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[24px]">
                      co_present
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-primary mb-space-xs">
                    Plan Lesson Intervention
                  </h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Teachers receive a ready-to-run 15-minute lesson module. Nothing deploys until the educator inspects and approves it.
                  </p>
                </div>
                <div className="mt-space-lg pt-space-xs text-secondary font-label-sm text-label-sm uppercase tracking-wide">
                  Educator Sovereignty First
                </div>
              </div>
              {/* Step 04 */}
              <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-md">
                    <span className="font-headline-sm text-headline-sm text-secondary font-bold">
                      04
                    </span>
                    <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[24px]">
                      touch_app
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-primary mb-space-xs">
                    Adaptive Student Micro-Check
                  </h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Students receive 2-3 gameless, calm conceptual inquiries designed to untangle their specific mental knot.
                  </p>
                </div>
                <div className="mt-space-lg pt-space-xs text-secondary font-label-sm text-label-sm uppercase tracking-wide">
                  Safe Reflection Canvas
                </div>
              </div>
              {/* Step 05 */}
              <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-md">
                    <span className="font-headline-sm text-headline-sm text-secondary font-bold">
                      05
                    </span>
                    <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[24px]">
                      vital_signs
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-primary mb-space-xs">
                    3-Minute Pulse Check
                  </h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Quick follow-up confirms whether the misconception has dissipated or shifted toward an edge case.
                  </p>
                </div>
                <div className="mt-space-lg pt-space-xs text-secondary font-label-sm text-label-sm uppercase tracking-wide">
                  Progress Verification
                </div>
              </div>
              {/* Step 06 */}
              <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-md">
                    <span className="font-headline-sm text-headline-sm text-primary font-bold">
                      06
                    </span>
                    <span aria-hidden="true" className="material-symbols-outlined text-primary text-[24px]">
                      mark_email_read
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-primary mb-space-xs">
                    Plain-Language Home Update
                  </h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Families receive a synthesized snapshot: the breakthrough made, the current question, and a natural dinner prompt.
                  </p>
                </div>
                <div className="mt-space-lg pt-space-xs text-primary font-label-sm text-label-sm uppercase tracking-wide font-bold">
                  Family Connection
                </div>
              </div>
            </div>
          </section>
          {/* Section 4: Stakeholder Portals (3 Deep Dives) */}
          <section className="w-full bg-surface-container py-space-xl">
            <div className="max-w-[1360px] mx-auto px-gutter-mobile md:px-margin-tablet lg:px-margin">
              <div className="text-center max-w-3xl mx-auto mb-space-xl">
                <span className="font-label-md text-label-md uppercase tracking-widest text-surface-tint font-bold block mb-space-xs">
                  Role-Engineered Clarities
                </span>
                <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-space-sm">
                  Tailored interfaces for every stakeholder.
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Teachers save hours of manual diagnostic grading. Students escape punitive ranking shame. Parents stay organically engaged without having to re-learn calculus.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
                {/* For Teachers Card */}
                <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-md flex flex-col">
                  <div className="p-space-lg bg-surface-container-low">
                    <div className="flex items-center gap-space-sm mb-space-xs">
                      <span aria-hidden="true" className="material-symbols-outlined text-primary text-[28px]">
                        school
                      </span>
                      <h3 className="font-headline-md text-headline-md text-primary">
                        For Teachers
                      </h3>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Class-wide insight without diagnostic grading fatigue.
                    </p>
                  </div>
                  <div className="p-space-lg flex-1 flex flex-col justify-between space-y-space-md">
                    <ul className="space-y-space-md">
                      <li className="flex items-start gap-3">
                        <span aria-hidden="true" className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                          group_work
                        </span>
                        <div>
                          <p className="font-title-sm text-title-sm text-on-surface">
                            Automated Cognitive Grouping
                          </p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Compass automatically clusters 30 students into 2-3 discrete misunderstanding cohorts.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span aria-hidden="true" className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                          draw
                        </span>
                        <div>
                          <p className="font-title-sm text-title-sm text-on-surface">
                            Lesson-Ready Remediations
                          </p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Download ready-to-project Socratic slides and conceptual simulations built for tomorrow's bellwork.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span aria-hidden="true" className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                          verified_user
                        </span>
                        <div>
                          <p className="font-title-sm text-title-sm text-on-surface">
                            Full Teacher Sovereignty
                          </p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            AI never sends unvetted remarks to students or parents. Every report requires one-click teacher sign-off.
                          </p>
                        </div>
                      </li>
                    </ul>
                    <div className="p-space-md rounded-xl bg-surface-container-high/60 mt-space-md">
                      <p className="font-label-sm text-label-sm text-primary font-bold uppercase mb-1">
                        Teacher Testimonial
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface italic">
                        "I cut my quiz diagnosis time from 3 hours to 10 minutes. I walk into Period 2 knowing precisely why my students doubted Newton's Third Law."
                      </p>
                    </div>
                  </div>
                </div>
                {/* For Students Card */}
                <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-md flex flex-col">
                  <div className="p-space-lg bg-surface-container-low">
                    <div className="flex items-center gap-space-sm mb-space-xs">
                      <span aria-hidden="true" className="material-symbols-outlined text-primary text-[28px]">
                        psychology_alt
                      </span>
                      <h3 className="font-headline-md text-headline-md text-primary">
                        For Students
                      </h3>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Low-anxiety exploration engineered for teenage brains.
                    </p>
                  </div>
                  <div className="p-space-lg flex-1 flex flex-col justify-between space-y-space-md">
                    <ul className="space-y-space-md">
                      <li className="flex items-start gap-3">
                        <span aria-hidden="true" className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                          sentiment_calm
                        </span>
                        <div>
                          <p className="font-title-sm text-title-sm text-on-surface">
                            Zero Punishment Diagnostics
                          </p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Mistakes are treated as interesting scientific hypotheses, not permanent GPA penalties.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span aria-hidden="true" className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                          explore
                        </span>
                        <div>
                          <p className="font-title-sm text-title-sm text-on-surface">
                            Bite-Sized Conceptual Inquiries
                          </p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            No daunting 40-question problem sheets. Just 3 sharp interactive scenarios focusing on mental models.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span aria-hidden="true" className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                          visibility_off
                        </span>
                        <div>
                          <p className="font-title-sm text-title-sm text-on-surface">
                            No Peer Leaderboards
                          </p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            We completely eliminate toxic classroom ranking gamification. Focus stays purely on self-directed insight.
                          </p>
                        </div>
                      </li>
                    </ul>
                    <div className="p-space-md rounded-xl bg-surface-container-high/60 mt-space-md">
                      <p className="font-label-sm text-label-sm text-primary font-bold uppercase mb-1">
                        Student Experience
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface italic">
                        "I always thought I was just bad at Physics. Compass showed me my math was great, but I was picturing gravity backward. It took 5 minutes to fix."
                      </p>
                    </div>
                  </div>
                </div>
                {/* For Parents Card */}
                <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-md flex flex-col">
                  <div className="p-space-lg bg-surface-container-low">
                    <div className="flex items-center gap-space-sm mb-space-xs">
                      <span aria-hidden="true" className="material-symbols-outlined text-primary text-[28px]">
                        home_repair_service
                      </span>
                      <h3 className="font-headline-md text-headline-md text-primary">
                        For Parents
                      </h3>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Compassionate clarity without STEM prerequisites.
                    </p>
                  </div>
                  <div className="p-space-lg flex-1 flex flex-col justify-between space-y-space-md">
                    <ul className="space-y-space-md">
                      <li className="flex items-start gap-3">
                        <span aria-hidden="true" className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                          translate
                        </span>
                        <div>
                          <p className="font-title-sm text-title-sm text-on-surface">
                            Multilingual Parent Dispatches
                          </p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Delivered natively in English, 한국어 (Korean), Spanish, Mandarin, and more for multi-generational families.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span aria-hidden="true" className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                          dinner_dining
                        </span>
                        <div>
                          <p className="font-title-sm text-title-sm text-on-surface">
                            Actionable Dinner Prompts
                          </p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Instead of "Why did you get a 65%?", ask an engaging, everyday thought experiment that lets your teenager explain.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span aria-hidden="true" className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                          sentiment_very_satisfied
                        </span>
                        <div>
                          <p className="font-title-sm text-title-sm text-on-surface">
                            Zero Educational Jargon
                          </p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            No standard-deviation charts or opaque pedagogy acronyms. Just clear, supportive narrative progress.
                          </p>
                        </div>
                      </li>
                    </ul>
                    <div className="p-space-md rounded-xl bg-surface-container-high/60 mt-space-md">
                      <p className="font-label-sm text-label-sm text-primary font-bold uppercase mb-1">
                        Parent Experience
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface italic">
                        "Finally, I don't feel powerless when looking at my daughter's science homework. We actually talked about rollercoasters over dinner."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* Section 5: Real Comparison Showcase (Standard vs Compass Note) */}
          <section id="parent-narratives" className="scroll-mt-16 w-full max-w-[1360px] mx-auto px-gutter-mobile md:px-margin-tablet lg:px-margin py-space-xl">
            <div className="bg-surface-container-lowest rounded-3xl p-space-lg md:p-space-xl shadow-lg">
              <div className="max-w-2xl mb-space-lg">
                <span className="font-label-md text-label-md uppercase tracking-widest text-surface-tint font-bold block mb-space-xs">
                  Direct Household Impact
                </span>
                <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-space-xs">
                  What happens when a report card arrives home?
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  See the direct difference between the automated email parents dread and the narrative clarity Compass delivers.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg items-stretch">
                {/* Standard Email */}
                <div className="p-space-lg rounded-2xl bg-surface-container-high/40 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-space-sm mb-space-md">
                      <span className="font-label-sm text-label-sm text-secondary font-mono">
                        Standard LMS Automated Notification
                      </span>
                      <span className="font-label-sm text-label-sm text-error">
                        Grade Alert
                      </span>
                    </div>
                    <p className="font-label-md text-label-md text-on-surface mb-space-xs font-bold">
                      Subject: Automated Grade Alert for Jun-seo Park
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                      Dear Parent, this automated notice is to inform you that Jun-seo scored below 70% on Unit 3 Quiz (Energy Transformations). Current overall GPA is at risk. Please contact the guidance office.
                    </p>
                    <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-xs text-center">
                      <span className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-error font-bold">
                        64.5%
                      </span>
                      <p className="font-label-sm text-label-sm text-secondary">
                        Unit 3 Weighted Assessment
                      </p>
                    </div>
                  </div>
                  <div className="mt-space-lg p-space-sm rounded-lg bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[16px]">
                      mood_bad
                    </span>
                    <span>
                      Triggers defensive arguing and stress during family dinner.
                    </span>
                  </div>
                </div>
                {/* Compass Weekly Note */}
                <div className="p-space-lg rounded-2xl bg-secondary-container/40 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-space-sm mb-space-md">
                      <span className="font-label-sm text-label-sm text-primary font-bold">
                        Compass Narrative Snapshot
                      </span>
                      <span className="font-label-sm text-label-sm bg-surface-container-lowest px-2 py-0.5 rounded text-primary">
                        Every Friday 4:00 PM
                      </span>
                    </div>
                    <p className="font-title-sm text-title-sm text-primary mb-space-xs">
                      Jun-seo is making solid progress in AP Physics
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface mb-space-md">
                      "This week, Jun-seo showed complete mastery over gravitational energy calculations. His quiz indicated he is currently mixing up thermal friction loss with total momentum."
                    </p>
                    <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-xs">
                      <div className="flex items-center gap-1.5 text-surface-tint font-label-sm text-label-sm font-bold uppercase mb-1">
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                          restaurant
                        </span>
                        <span>
                          Friday Dinner Question
                        </span>
                      </div>
                      <p className="font-headline-sm text-headline-sm text-primary italic leading-snug">
                        "When you slide down a plastic playground slide, where does the energy go when your pants get warm?"
                      </p>
                    </div>
                  </div>
                  <div className="mt-space-lg p-space-sm rounded-lg bg-surface-container-lowest text-primary font-label-sm text-label-sm flex items-center justify-between shadow-xs">
                    <span className="flex items-center gap-2 font-bold">
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                        thumb_up
                      </span>
                      <span>
                        Engenders curiosity and empowers the student to teach.
                      </span>
                    </span>
                    <span className="text-secondary">
                      Teacher Approved ✓
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* Section 6: Guarantees & Ethical Pedagogy */}
          <section className="w-full bg-surface-container-low py-space-xl">
            <div className="max-w-[1360px] mx-auto px-gutter-mobile md:px-margin-tablet lg:px-margin">
              <div className="text-center max-w-3xl mx-auto mb-space-xl">
                <span className="font-label-md text-label-md uppercase tracking-widest text-surface-tint font-bold block mb-space-xs">
                  Ethical Core
                </span>
                <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-space-xs">
                  Our Four Pedagogical Commitments
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  We believe technology in high school education must be gentle, truthful, and strictly subordinate to the classroom teacher.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
                <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-xs">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary mb-space-md">
                    <span aria-hidden="true" className="material-symbols-outlined">
                      gavel
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-primary mb-space-xs">
                    Educator Sovereignty
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    AI is an assistant, never an arbiter. Every remediation plan, score adjustment, or parent dispatch is subject to the teacher’s final approval.
                  </p>
                </div>
                <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-xs">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary mb-space-md">
                    <span aria-hidden="true" className="material-symbols-outlined">
                      visibility
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-primary mb-space-xs">
                    Student Transparency
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    No black-box algorithmic profiling. Students can inspect exactly why a misconception was flagged and provide feedback on their own reasoning.
                  </p>
                </div>
                <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-xs">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary mb-space-md">
                    <span aria-hidden="true" className="material-symbols-outlined">
                      translate
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-primary mb-space-xs">
                    No Jargon for Families
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    We ban impenetrable testing acronyms. Communications are translated and written in warm, natural everyday language for all parents.
                  </p>
                </div>
                <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-xs">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary mb-space-md">
                    <span aria-hidden="true" className="material-symbols-outlined">
                      spa
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-primary mb-space-xs">
                    Growth over Labels
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    No permanent diagnostic tags. The moment a teenager demonstrates conceptual clarity, their diagnostic profile clears immediately.
                  </p>
                </div>
              </div>
            </div>
          </section>
          {/* Section 7: Grand Maroon CTA Banner */}
          <section id="get-started" className="w-full max-w-[1360px] mx-auto px-gutter-mobile md:px-margin-tablet lg:px-margin py-space-xl scroll-mt-16">
            <div className="bg-primary-container rounded-3xl p-space-lg md:p-space-xl text-center text-on-primary shadow-xl relative overflow-hidden">
              {/* Decorative background blur circle */}
              <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-tertiary-container/30 blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-on-tertiary-container/20 blur-3xl pointer-events-none"></div>
              <div className="relative z-10 max-w-2xl mx-auto">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary-container font-bold block mb-space-sm">
                  Join 42 High Schools Pioneering Diagnostic Clarity
                </span>
                <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-space-md leading-tight">
                  Bring diagnostic clarity to your high school science classroom.
                </h2>
                <p className="font-body-lg text-body-lg text-secondary-container mb-space-lg opacity-90">
                  Transform panic into progress. Free for individual high school science educators and their classrooms forever.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-space-md mb-space-md">
                  <Link className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-xl py-space-sm rounded-xl bg-secondary-container text-primary font-title-sm text-title-sm hover:bg-surface-bright hover:-translate-y-0.5 transition-all shadow-md" to="/signup">
                    <span>
                      Get Started for Free
                    </span>
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </Link>
                  <Link className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-lg py-space-sm rounded-xl bg-tertiary-container text-on-primary font-title-sm text-title-sm hover:bg-tertiary transition-all" to="/app">
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      calendar_month
                    </span>
                    <span>
                      Explore the Demo Workspace
                    </span>
                  </Link>
                </div>
                <p className="font-label-sm text-label-sm text-secondary-container/80 flex items-center justify-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                    sync
                  </span>
                  <span>
                    Zero configuration required: Seamlessly integrates with Google Classroom, Canvas, or standard paper quizzes.
                  </span>
                </p>
              </div>
            </div>
          </section>
          {/* Institutional Academic Credit Badge */}
          <div className="w-full text-center py-space-md text-secondary font-label-sm text-label-sm">
            <span>
              Compass Academic Initiative · Collaborative Capstone Research, Sungkyunkwan University (SKKU)
            </span>
          </div>
        </div>
      </main>
      <footer className="w-full bg-surface-container-low shadow-[0_-1px_8px_rgba(102,18,20,0.03)]">
        <div className="max-w-[1360px] mx-auto px-gutter-mobile md:px-margin-tablet lg:px-margin py-space-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-space-lg">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-sm">
              <img alt="" className="h-6 w-auto object-contain" src="/images/logo.png" />
              <span className="font-headline-sm text-headline-sm text-primary">
                Compass
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
              An editorial, dignified learning sanctuary engineered for high school conceptual discovery and collaborative dialogue.
            </p>
          </div>
          <div className="flex flex-wrap gap-space-lg font-label-md text-label-md text-on-surface-variant">
            <a className="hover:text-primary transition-colors" href="#continuum">
              Collegiate Standards
            </a>
            <a className="hover:text-primary transition-colors" href="#overview">
              Student Agency
            </a>
            <a className="hover:text-primary transition-colors" href="#parent-narratives">
              Parent Communications
            </a>
            <a className="hover:text-primary transition-colors" href="#get-started">
              Institutional Privacy
            </a>
          </div>
          <div className="font-label-sm text-label-sm text-secondary">
            © 2025 Compass Academic Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  )
}
