import type { ReactNode } from 'react'

/** A simple browser window mockup: window dots, an address pill, and whatever goes inside. */
export function BrowserWindow({ url, children, className = '' }: { url: string; children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-card-line bg-white shadow-card ${className}`}>
      <div className="flex items-center gap-3 border-b border-card-line bg-[#F3F7FC] px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </span>
        <span className="mx-auto truncate rounded-md bg-white px-3 py-0.5 font-mono text-[12px] text-navy-soft">{url}</span>
        <span aria-hidden="true" className="w-[42px]" />
      </div>
      <div className="bg-[#F6F9FD] p-4 md:p-5" style={{ backgroundImage: 'radial-gradient(#D6E6F7 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
        {children}
      </div>
    </div>
  )
}
