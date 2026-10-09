export type Status = 'mastery' | 'misconception' | 'review' | 'upcoming'

const STYLES: Record<Status, { label: string; className: string; dot: string }> = {
  mastery: { label: 'Mastery', className: 'bg-[#EAF3EB] text-[#4F6D54]', dot: 'bg-[#4F6D54]' },
  misconception: { label: 'Misconception', className: 'bg-[#F8E6DD] text-[#A4502C]', dot: 'bg-[#C3643B]' },
  review: { label: 'Conceptual Review', className: 'bg-secondary-container text-primary-container', dot: 'bg-primary-container' },
  upcoming: { label: 'Upcoming', className: 'bg-surface-container-highest text-secondary', dot: 'bg-outline' },
}

/** Pill-shaped status badge from the design system (sage / terracotta / rose). */
export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const s = STYLES[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm whitespace-nowrap ${s.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {label ?? s.label}
    </span>
  )
}
