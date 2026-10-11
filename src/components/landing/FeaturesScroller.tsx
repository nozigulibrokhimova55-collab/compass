import { useRef, useState, type ReactNode } from 'react'
import { gsap, useGSAP } from '../../lib/motion'
import { Icon } from '../Icon'
import { SelectFrame } from '../ui/SelectFrame'
import { Chars, Kinetic } from '../ui/Kinetic'

/**
 * Pinned sideways scrolling only on wider screens with motion allowed; everything else gets a
 * stacked list. The layout classes use the matching Tailwind variants (`md:motion-safe:`).
 */
const PIN_MEDIA = '(min-width: 768px) and (prefers-reduced-motion: no-preference)'

/** `frame` names the sample card: it appears in the window title and the "selected" tab. */
type Feature = { title: string; text: string; madeFor: string[]; frame: string; sample: ReactNode }

const fileName = (f: Feature, i: number) => `${String(i + 1).padStart(2, '0')}_${f.frame}.fig`

const chip = 'rounded-full border border-card-line bg-white px-2.5 py-1 font-inter text-[13px] font-medium text-navy'
const sampleTag = 'rounded-[4px] bg-note px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-navy'

function SampleCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-card-line bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="font-inter text-[15px] font-semibold text-navy">{title}</span>
        <span className={sampleTag}>Sample</span>
      </div>
      {children}
    </div>
  )
}

const FEATURES: Feature[] = [
  {
    title: 'Quizzes, made for you',
    text: 'Upload your lesson notes and Compass drafts a quiz. You read it, change what you want, and only then does it go to your students.',
    madeFor: ['Teachers'],
    frame: 'quiz_draft',
    sample: (
      <SampleCard title="Draft quiz: Forces, lesson 4">
        <p className="mb-3 flex items-center gap-1.5 font-inter text-[13px] text-navy-soft">
          <Icon name="description" className="text-[16px]" /> From: forces_lesson_notes.pdf
        </p>
        <ol className="space-y-2 font-inter text-[14px] leading-5 text-navy">
          {['A cart rolls at a steady speed. Is there a net force on it?', 'Draw the forces on a book resting on a table.', 'Why does a ball thrown up slow down?'].map((q, i) => (
            <li key={q} className="flex gap-2 rounded-lg bg-sky-bottom/25 px-3 py-2">
              <span className="font-semibold">{i + 1}.</span>
              <span className="flex-1">{q}</span>
              <Icon name="edit" className="text-[16px] text-navy-soft" />
            </li>
          ))}
        </ol>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-inter text-[13px] text-navy-soft">Not sent yet</span>
          <span className="rounded-lg bg-navy px-3 py-1.5 font-inter text-[13px] font-semibold text-white">Review and send</span>
        </div>
      </SampleCard>
    ),
  },
  {
    title: 'AI that follows your lead',
    text: 'Compass marks answers and spots the idea behind each mistake. You can adjust topics, difficulty, and wording so it fits your class, not the other way around.',
    madeFor: ['Teachers'],
    frame: 'marking',
    sample: (
      <SampleCard title="Question 3, one student’s answer">
        <p className="rounded-lg bg-sky-bottom/25 px-3 py-2 font-hand text-[20px] leading-6 text-navy">“It slows down because the push runs out.”</p>
        <p className="mt-3 font-inter text-[14px] leading-5 text-navy">
          <span className="font-semibold">The idea behind it:</span> thinks a moving thing needs a push to keep going.
        </p>
        <div className="mt-4 space-y-2.5 font-inter text-[13px] text-navy">
          <div className="flex items-center justify-between">
            <span>Topic</span>
            <span className={chip}>Newton’s first law</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Difficulty</span>
            <span className="relative h-1.5 w-32 rounded-full bg-card-line">
              <span className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-select" />
              <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-select bg-white" />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Wording</span>
            <span className={chip}>Simple</span>
          </div>
        </div>
      </SampleCard>
    ),
  },
  {
    title: 'Attendance in a few taps',
    text: 'Take attendance quickly and notice patterns over time, without another spreadsheet.',
    madeFor: ['Teachers', 'Parents'],
    frame: 'attendance',
    sample: (
      <SampleCard title="Period 3, today">
        <ul className="space-y-2 font-inter text-[14px] text-navy">
          {[
            ['Student A', 'Here'],
            ['Student B', 'Here'],
            ['Student C', 'Late'],
            ['Student D', 'Here'],
          ].map(([name, status]) => (
            <li key={name} className="flex items-center justify-between rounded-lg bg-sky-bottom/25 px-3 py-2">
              <span>{name}</span>
              <span className="flex gap-1">
                {['Here', 'Late', 'Away'].map((s) => (
                  <span key={s} className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${s === status ? 'bg-navy text-white' : 'text-navy-soft'}`}>
                    {s}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-1.5 font-inter text-[13px] text-navy">
          <Icon name="info" className="text-[16px] text-select" /> Student C has been late on Mondays lately.
        </p>
      </SampleCard>
    ),
  },
  {
    title: 'Focus on the gaps',
    text: 'Every student gets a retry quiz built from their own mistakes. Teachers can tweak it before it goes out, so practice is never one-size-fits-all.',
    madeFor: ['Students', 'Teachers'],
    frame: 'retry_quiz',
    sample: (
      <SampleCard title="Retry quiz for Student A">
        <p className="mb-3 font-inter text-[13px] text-navy-soft">Built from 2 questions missed on Friday</p>
        <ul className="space-y-2 font-inter text-[14px] leading-5 text-navy">
          <li className="rounded-lg bg-sky-bottom/25 px-3 py-2">A hockey puck slides on ice. What keeps it moving?</li>
          <li className="rounded-lg bg-sky-bottom/25 px-3 py-2">Which arrow shows the force on a ball at the top of its throw?</li>
        </ul>
        <p className="mt-3 flex items-center gap-1.5 font-inter text-[13px] text-navy">
          <Icon name="edit_note" className="text-[18px] text-select" /> Your teacher changed question 2
        </p>
      </SampleCard>
    ),
  },
  {
    title: 'A clear view for parents',
    text: 'See what your child is good at, what they’re working on, and one simple way to help this week. In your own language, no jargon.',
    madeFor: ['Parents'],
    frame: 'parent_view',
    sample: (
      <SampleCard title="This week for your child">
        <dl className="space-y-3 font-inter text-[14px] leading-5 text-navy">
          <div>
            <dt className="font-semibold">Good at</dt>
            <dd className="text-navy-soft">Reading graphs of speed over time.</dd>
          </div>
          <div>
            <dt className="font-semibold">Working on</dt>
            <dd className="text-navy-soft">Why things keep moving without a push.</dd>
          </div>
          <div className="rounded-lg bg-note px-3 py-2">
            <dt className="font-semibold">One way to help</dt>
            <dd>Ask: “Why does a sled keep sliding after you let go?”</dd>
          </div>
        </dl>
        <div className="mt-3 flex gap-1.5">
          <span className={chip}>English</span>
          <span className={chip} lang="ko">
            한국어
          </span>
          <span className={chip}>Español</span>
        </div>
      </SampleCard>
    ),
  },
]

/**
 * Five feature panels. On wide screens the section pins and scrolling moves the panels
 * sideways, one at a time. On mobile, or with reduced motion, they are a normal stacked list.
 */
export function FeaturesScroller() {
  const root = useRef<HTMLElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const last = FEATURES.length - 1

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(PIN_MEDIA, () => {
        const el = track.current!
        // Each panel is one viewport wide. Panels rest for a moment between slides so
        // scrolling feels like stepping through them one at a time.
        const step = () => window.innerWidth
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pin.current,
            pin: true,
            start: 'top top',
            end: () => `+=${window.innerHeight * 0.9 * FEATURES.length}`,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
          // On the timeline (not the trigger) so the counter keeps up while the scrub catches up.
          onUpdate: () => setIndex(Math.round(-Number(gsap.getProperty(el, 'x')) / step())),
        })
        tl.to({}, { duration: 0.35 })
        for (let i = 1; i <= last; i++) {
          tl.to(el, { x: () => -i * step(), duration: 1, ease: 'power2.inOut' }).to({}, { duration: 0.5 })
        }
        return () => setIndex(0)
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="features" aria-labelledby="features-title">
      <div ref={pin} className="md:motion-safe:flex md:motion-safe:h-screen md:motion-safe:flex-col md:motion-safe:overflow-hidden md:motion-safe:pt-16">
        <div className="mx-auto flex w-full max-w-[1240px] items-end justify-between gap-6 px-4 pt-16 md:px-8 md:motion-safe:pt-10">
          <div>
            <p className="w-fit rounded-full bg-white/80 px-3 py-1 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-navy backdrop-blur-sm">Features</p>
            <Kinetic id="features-title" label="What Compass does" className="mt-3 font-grotesk text-[36px] md:text-[52px] font-extrabold leading-none tracking-[-0.03em] text-navy">
              <Chars text="What Compass does" />
            </Kinetic>
          </div>
          <div className="hidden md:motion-safe:flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 backdrop-blur-sm" aria-hidden="true">
            <span className="font-mono text-[13px] font-semibold text-navy tabular-nums">
              {index + 1} of {FEATURES.length}
            </span>
            <span className="flex gap-1.5">
              {FEATURES.map((f, i) => (
                <span key={f.title} className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-7 bg-accent-strong' : 'w-3 bg-navy/25'}`} />
              ))}
            </span>
          </div>
        </div>

        <div
          ref={track}
          className="flex flex-col gap-10 px-4 py-12 md:px-8 md:motion-safe:min-h-0 md:motion-safe:w-max md:motion-safe:flex-1 md:motion-safe:flex-row md:motion-safe:items-center md:motion-safe:gap-0 md:motion-safe:px-0 md:motion-safe:py-8"
        >
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              className="mx-auto w-full max-w-[1240px] md:motion-safe:mx-0 md:motion-safe:flex md:motion-safe:w-screen md:motion-safe:max-w-none md:motion-safe:justify-center md:motion-safe:px-8"
            >
              <div className="w-full max-w-[1176px] overflow-hidden rounded-3xl border border-card-line bg-white shadow-card">
                {/* Window bar, like a design file */}
                <div className="flex h-14 items-center gap-4 border-b border-card-line px-5" aria-hidden="true">
                  <span className="flex gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                    <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                    <span className="h-3 w-3 rounded-full bg-[#28C840]" />
                  </span>
                  <span className="font-mono text-[14px] font-semibold text-navy">{fileName(f, i)}</span>
                  <span className="ml-auto font-mono text-[13px] text-navy-soft">100%</span>
                </div>

                {/* Dotted canvas */}
                <div
                  className="grid grid-cols-1 items-center gap-10 bg-[#F6F9FD] px-6 pb-14 pt-8 md:grid-cols-[1fr_1.05fr] md:gap-14 md:px-12 md:pb-16 md:pt-10"
                  style={{ backgroundImage: 'radial-gradient(rgba(22,27,38,0.13) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                >
                  <div>
                    <span className="font-grotesk text-[64px] md:text-[96px] font-black leading-none tracking-[-0.04em] text-accent">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <Kinetic as="h3" label={f.title} className="mt-4 font-grotesk text-[28px] md:text-[40px] font-extrabold leading-[1.05] tracking-[-0.025em] text-navy">
                      <Chars text={f.title} />
                    </Kinetic>
                    <p className="mt-4 max-w-[30rem] font-inter text-[17px] leading-[28px] text-navy">{f.text}</p>
                  </div>

                  <div className="relative pt-5">
                    <SelectFrame label={`${f.frame} · selected`} tabPlacement="bottom-right" className="rounded-2xl">
                      {f.sample}
                    </SelectFrame>
                    {/* Orange "picked" badge with who it's made for */}
                    <div className="absolute right-0 top-0 z-10 flex translate-x-3 items-center gap-2">
                      <span className="-rotate-3 rounded-lg bg-accent-strong px-3 py-1 font-inter text-[13px] font-semibold text-white shadow-float">
                        Made for: {f.madeFor.join(', ')}
                      </span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-full border-[2.5px] border-accent bg-white shadow-float" aria-hidden="true">
                        <Icon name="check" className="text-[24px] font-bold text-accent-strong" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
