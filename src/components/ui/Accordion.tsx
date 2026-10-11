import { useId, useState, type ReactNode } from 'react'
import { Icon } from '../Icon'

type AccordionItem = { title: string; body: ReactNode; /** Folder tab label, e.g. `step_01.frame`. */ tab?: string }

/** Stack of frame-tab cards with orange numbers and a plus that turns into a cross when open. */
export function Accordion({ items, defaultOpen = 0, className = '' }: { items: AccordionItem[]; defaultOpen?: number | null; className?: string }) {
  const [open, setOpen] = useState<number | null>(defaultOpen)
  const base = useId()

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {items.map((item, i) => {
        const isOpen = open === i
        const btn = `${base}-b${i}`
        const panel = `${base}-p${i}`
        return (
          <div key={i} className={item.tab ? 'pt-[28px]' : ''}>
            <div className="relative">
              {item.tab && (
                <span className="absolute bottom-[calc(100%-1px)] left-0 z-[1] flex h-[28px] items-center rounded-t-xl border border-b-0 border-card-line bg-white px-3 font-mono text-[12px] text-navy-soft">
                  {item.tab}
                </span>
              )}
              <div className={`rounded-2xl ${item.tab ? 'rounded-tl-none' : ''} border bg-white shadow-card transition-colors ${isOpen ? 'border-select' : 'border-card-line'}`}>
                <h3>
                  <button
                    id={btn}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panel}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group flex w-full cursor-pointer items-center gap-4 px-5 py-5 text-left md:px-7"
                  >
                    <span className="font-grotesk text-[22px] font-black tabular-nums text-accent-strong">{String(i + 1).padStart(2, '0')}</span>
                    <span className="flex-1 font-grotesk text-[19px] font-bold leading-6 tracking-[-0.01em] text-navy md:text-[21px]">{item.title}</span>
                    <span
                      aria-hidden="true"
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-navy text-navy transition-[transform,background-color,color] duration-300 group-hover:bg-navy group-hover:text-white ${isOpen ? 'rotate-45 bg-navy text-white' : ''}`}
                    >
                      <Icon name="add" className="text-[20px]" />
                    </span>
                  </button>
                </h3>
                <div id={panel} role="region" aria-labelledby={btn} hidden={!isOpen} className="animate-fade-up px-5 pb-6 font-inter text-[16px] leading-7 text-navy-soft md:px-7 md:pl-[76px]">
                  {item.body}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
