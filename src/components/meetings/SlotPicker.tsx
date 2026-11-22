import { groupByDay, timeRange } from '../../lib/meetingTime'
import { Icon } from '../Icon'

export type PickableSlot = { slotId: string; startsAt: string; endsAt: string }

type SlotPickerProps = {
  slots: PickableSlot[]
  /** The picked slot's id, or null when nothing is picked. */
  value: string | null
  onChange: (slotId: string) => void
  /** Read out by screen readers, e.g. "New time". */
  legend: string
  /** Radio group name. Has to be different for every picker on the page. */
  name: string
}

/** Free times, one day at a time, as big tappable choices. Times are shown in Seoul time. */
export function SlotPicker({ slots, value, onChange, legend, name }: SlotPickerProps) {
  const days = groupByDay(slots, (s) => s.startsAt)
  return (
    <fieldset className="grid gap-4">
      <legend className="sr-only">{legend}</legend>
      {days.map((d) => (
        <div key={d.day}>
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-navy-soft">{d.title}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {d.items.map((s) => {
              const on = value === s.slotId
              return (
                <label
                  key={s.slotId}
                  className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 font-inter text-[15px] font-semibold transition-colors duration-150 active:scale-[0.98] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-select ${
                    on ? 'border-accent-strong bg-[#FBE1D8] text-[#9C3412]' : 'border-card-line bg-white text-navy hover:border-navy'
                  }`}
                >
                  <input type="radio" name={name} checked={on} onChange={() => onChange(s.slotId)} className="sr-only" />
                  <Icon name={on ? 'radio_button_checked' : 'radio_button_unchecked'} className="text-[20px]" />
                  {timeRange(s.startsAt, s.endsAt)}
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </fieldset>
  )
}