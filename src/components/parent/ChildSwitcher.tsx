import { useChildren } from '../../lib/sampleData'
import { Avatar } from '../ui/ThreadCard'

/** Pick which child to look at. Big pills, one per child, on a white backing so they read on the grid. */
export function ChildSwitcher({ className = '' }: { className?: string }) {
  const { children, selected, select } = useChildren()
  if (children.length < 2) return null
  return (
    <fieldset className={`w-full max-w-md ${className}`}>
      <legend className="sr-only">Which child</legend>
      <div className="flex gap-1 rounded-2xl border border-card-line bg-white/90 p-1 backdrop-blur-sm">
        {children.map((c) => {
          const on = c.id === selected.id
          return (
            <label
              key={c.id}
              className={`flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 font-inter text-[16px] font-semibold transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-select ${
                on ? 'bg-navy text-white' : 'text-navy hover:bg-[#EEF4FB]'
              }`}
            >
              <input type="radio" name="child" checked={on} onChange={() => select(c.id)} className="sr-only" />
              <Avatar person={{ name: c.name, initials: c.initials, tone: on ? 'orange' : 'blue' }} size="sm" />
              {c.firstName}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
