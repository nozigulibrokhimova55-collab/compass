import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Role } from '../../lib/roles'
import { Icon } from '../Icon'
import { Frame } from './Frame'
import { fillHover } from './hover'
import { Chars, Kinetic } from './Kinetic'

const ROLES: { id: Role; icon: string; title: string; text: string; as: string }[] = [
  { id: 'teacher', icon: 'school', title: 'Teachers', text: 'Make quizzes in minutes and see what your class really needs.', as: 'a teacher' },
  { id: 'student', icon: 'backpack', title: 'Students', text: 'Practice the things you missed, at your own pace.', as: 'a student' },
  { id: 'parent', icon: 'family_restroom', title: 'Parents', text: 'See how your child is doing and how you can help.', as: 'a parent' },
]

/** "Who are you?" heading, three selectable role cards, and a continue button for the picked role. */
export function RolePicker({ headingLevel = 'h2' }: { headingLevel?: 'h1' | 'h2' }) {
  const [picked, setPicked] = useState<Role | null>(null)
  const pickedRole = ROLES.find((r) => r.id === picked)
  const Heading = headingLevel

  return (
    <div className="text-center">
      <Kinetic as={Heading} label="Who are you?" className="font-grotesk text-[44px] md:text-[72px] font-extrabold leading-none tracking-[-0.035em] text-navy">
        <Chars text="Who are you?" />
      </Kinetic>
      <p className="mx-auto mt-5 w-fit rounded-full bg-white/80 px-5 py-2 font-inter text-[18px] leading-7 text-navy backdrop-blur-sm">Pick one and we’ll set things up for you.</p>

      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6 text-left">
        {ROLES.map((r) => {
          const selected = picked === r.id
          return (
            <Frame key={r.id} show={selected} className="rounded-3xl">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => setPicked(r.id)}
                className={`relative flex h-full w-full flex-col rounded-3xl border bg-white p-7 md:p-8 text-left shadow-card transition-all duration-200 cursor-pointer hover:-translate-y-1 ${
                  selected ? 'border-select' : 'border-card-line'
                }`}
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-bottom/50 text-navy">
                  <Icon name={r.icon} className="text-[38px]" />
                </span>
                <span className="mt-6 font-grotesk text-[28px] font-extrabold tracking-tight text-navy">{r.title}</span>
                <span className="mt-2 font-inter text-[17px] leading-[27px] text-navy-soft">{r.text}</span>
                <span
                  aria-hidden="true"
                  className={`absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-select text-navy transition-all duration-200 ${
                    selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                  }`}
                >
                  <Icon name="check" className="text-[20px]" />
                </span>
              </button>
            </Frame>
          )
        })}
      </div>

      {/* Space is reserved so the page doesn't jump when the button appears. */}
      <div className="mt-10 flex h-14 items-center justify-center" aria-live="polite">
        {pickedRole && (
          <Link
            to={`/signup?role=${pickedRole.id}`}
            {...fillHover}
            className="fill-host inline-flex items-center gap-2 rounded-xl bg-navy px-7 py-4 font-inter text-[17px] font-semibold text-white shadow-float [--fill:#C9441A] animate-fade-up"
          >
            Continue as {pickedRole.as}
            <Icon name="arrow_forward" className="text-[20px]" />
          </Link>
        )}
      </div>
    </div>
  )
}
