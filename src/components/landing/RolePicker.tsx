import { useState } from 'react'
import type { Role } from '../../lib/roles'
import { Icon } from '../Icon'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Frame } from '../ui/Frame'
import { SectionHeader } from '../ui/SectionHeader'
import { ROLE_OPTIONS } from './roleOptions'

/** Three role cards in frames (`teacher.frame`, …). Picking one keeps its selection outline on. */
export function RoleCards({ picked, onPick, compact = false }: { picked: Role | null; onPick: (r: Role) => void; compact?: boolean }) {
  return (
    <div className={`grid grid-cols-1 text-left ${compact ? 'gap-4 sm:grid-cols-3' : 'gap-8 md:grid-cols-3 md:gap-6'}`}>
      {ROLE_OPTIONS.map((r) => {
        const selected = picked === r.id
        return (
          <Frame key={r.id} label={`${r.id}.frame`} selected={selected} bodyClassName="p-0">
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onPick(r.id)}
              className={`relative flex h-full w-full cursor-pointer flex-col rounded-3xl rounded-tl-none text-left transition-colors duration-200 active:scale-[0.99] ${
                compact ? 'p-5' : 'p-7 md:p-8'
              } ${selected ? 'bg-[#F2F8FE]' : 'hover:bg-[#F8FBFE]'}`}
            >
              <span className={`flex items-center justify-center rounded-2xl bg-sky-bottom/50 text-navy ${compact ? 'h-11 w-11' : 'h-16 w-16'}`}>
                <Icon name={r.icon} className={compact ? 'text-[26px]' : 'text-[38px]'} />
              </span>
              <span className={`font-grotesk font-extrabold tracking-tight text-navy ${compact ? 'mt-4 text-[20px]' : 'mt-6 text-[28px]'}`}>{r.title}</span>
              <span className={`mt-2 font-inter text-navy-soft ${compact ? 'text-[15px] leading-6' : 'text-[17px] leading-[27px]'}`}>{r.text}</span>
              {!compact && (
                <span className="mt-6 flex flex-wrap gap-2">
                  {r.chips.map(([icon, label]) => (
                    <Chip key={label} static icon={icon}>
                      {label}
                    </Chip>
                  ))}
                </span>
              )}
              <span
                aria-hidden="true"
                className={`absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-select text-navy transition-[transform,opacity] duration-200 ${
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
  )
}

/** "Who are you?" header, the three role cards, and a continue button for the picked role. */
export function RolePicker({ headingLevel = 'h2' }: { headingLevel?: 'h1' | 'h2' }) {
  const [picked, setPicked] = useState<Role | null>(null)
  const pickedRole = ROLE_OPTIONS.find((r) => r.id === picked)

  return (
    <div className="text-center">
      <SectionHeader as={headingLevel} script="first things first" title="Who are you?" note="Pick one and we’ll set things up for you." />

      <div className="mt-14">
        <RoleCards picked={picked} onPick={setPicked} />
      </div>

      {/* Space is reserved so the page doesn't jump when the button appears. */}
      <div className="mt-10 flex h-14 items-center justify-center" aria-live="polite">
        {pickedRole && (
          <Button to={`/signup?role=${pickedRole.id}`} variant="navy" size="lg" icon="arrow_forward" className="animate-fade-up shadow-float">
            Continue as {pickedRole.as}
          </Button>
        )}
      </div>
    </div>
  )
}
