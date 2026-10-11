import { useEffect, type MouseEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { FeaturesScroller } from '../components/landing/FeaturesScroller'
import { SelectFrame } from '../components/ui/SelectFrame'
import { Chars, Kinetic } from '../components/ui/Kinetic'
import { RolePicker } from '../components/landing/RolePicker'
import { SiteFooter } from '../components/ui/SiteFooter'
import { SiteHeader } from '../components/ui/SiteHeader'
import { fillHover } from '../components/ui/fillHover'
import { SkyBackground } from '../components/ui/SkyBackground'
import { scrollToId, startSmoothScroll } from '../lib/smoothScroll'

const container = 'mx-auto w-full max-w-[1240px] px-4 md:px-8'

const jump = (id: string) => (e: MouseEvent) => {
  e.preventDefault()
  scrollToId(id)
}

export default function Landing() {
  const { hash } = useLocation()

  useEffect(() => startSmoothScroll(), [])

  // Arriving from another page via /#features etc.
  useEffect(() => {
    if (!hash) return
    const t = window.setTimeout(() => scrollToId(hash.slice(1)), 150)
    return () => window.clearTimeout(t)
  }, [hash])

  return (
    <div className="min-h-screen font-inter text-navy antialiased">
      <SkyBackground />
      <SiteHeader />

      <main>
        <section id="about" className={`${container} relative flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center pb-28 pt-14 text-center`}>
          <Kinetic
            as="h1"
            intro
            hoverColor
            label="Know why students struggle. Act on it together."
            className="font-grotesk text-[46px] sm:text-[64px] lg:text-[84px] font-extrabold leading-[0.98] tracking-[-0.04em] text-navy"
          >
            <Chars text="Know why students struggle." />
            <br />
            <Chars text="Act on it together." />
          </Kinetic>
          <SelectFrame label="about.txt" dashed className="mt-10 max-w-[720px] rounded-md bg-white/80 px-6 py-5 backdrop-blur-sm">
            <p className="text-left font-inter text-[18px] leading-[30px] text-navy">
              Compass is a learning platform for high schools that brings teachers, students, and parents together. Teachers can turn their
              lesson notes into quizzes in minutes, review every question, and tailor them to their class. Each answer is checked, and Compass
              points out the idea behind every mistake. Attendance takes just a few taps. Students get retry quizzes built from their own
              mistakes, so practice goes where it’s needed most. Parents get a simple dashboard showing how their child is doing, in their own
              language.
            </p>
          </SelectFrame>
          <div className="mt-10 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <a
              href="#who-are-you"
              onClick={jump('who-are-you')}
              {...fillHover}
              className="fill-host rounded-xl bg-white/85 px-7 py-3.5 font-inter text-[17px] font-semibold text-accent-strong backdrop-blur-sm [--fill:#C9441A]"
            >
              Get started
            </a>
            <a
              href="#features"
              onClick={jump('features')}
              {...fillHover}
              className="fill-host rounded-xl border-2 border-navy bg-white/60 px-7 py-3 font-inter text-[17px] font-semibold text-navy [--fill:#161B26]"
            >
              See how it works
            </a>
          </div>
          <a
            href="#who-are-you"
            onClick={jump('who-are-you')}
            className="scroll-hint absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 font-mono text-[13px] font-semibold tracking-[0.08em] text-navy backdrop-blur-sm hover:bg-white"
          >
            scroll ↓
          </a>
        </section>

        <section id="who-are-you" className={`${container} py-24 md:py-32`}>
          <RolePicker />
        </section>

        <FeaturesScroller />
        <div className="h-24 md:h-32" />
      </main>

      <SiteFooter />
    </div>
  )
}
