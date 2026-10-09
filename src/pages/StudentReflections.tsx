import { useState } from 'react'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/Toast'
import { REFLECTIONS, type Reflection } from '../lib/data'

type Filter = 'all' | Reflection['state']

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All reflections' },
  { id: 'misconception', label: 'Misconception' },
  { id: 'review', label: 'Conceptual review' },
  { id: 'mastery', label: 'Mastery' },
]

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
}

export default function StudentReflections() {
  const notify = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState(REFLECTIONS[0].id)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')

  const list = REFLECTIONS.filter((r) => filter === 'all' || r.state === filter)
  const selected = REFLECTIONS.find((r) => r.id === selectedId) ?? REFLECTIONS[0]

  const counts = REFLECTIONS.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.state]: (acc[r.state] ?? 0) + 1 }), {})

  return (
    <div className="flex flex-col w-full pb-space-xl max-w-[1360px] mx-auto">
      <PageHeader
        eyebrow="Diagnostic Workspace / Student Reflections"
        title="Inquiry threads, in their own words"
        description="Short written reflections reveal how students are reasoning, not just whether they were right. Leave an encouraging note to keep the conversation going."
      />

      <div className="grid grid-cols-3 gap-space-md mb-space-xl max-w-2xl">
        {(['misconception', 'review', 'mastery'] as const).map((s) => (
          <div key={s} className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm">
            <StatusBadge status={s} label={s === 'review' ? 'Review' : undefined} />
            <p className="font-headline-lg text-headline-lg text-primary mt-space-xs">{counts[s] ?? 0}</p>
            <p className="font-body-sm text-body-sm text-secondary">this week</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
        <section className="lg:col-span-5 flex flex-col gap-space-md" aria-label="Reflections">
          <div className="flex flex-wrap gap-space-xs">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`px-space-md py-1.5 rounded-full font-label-md text-label-md transition-colors ${
                  filter === f.id ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <ul className="flex flex-col divide-y divide-[#EED4D7] bg-surface-container-lowest rounded-2xl shadow-sm p-space-xs">
            {list.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(r.id)
                    setDraft('')
                  }}
                  aria-current={r.id === selected.id}
                  className={`w-full text-left flex gap-space-md p-space-md rounded-xl transition-colors ${
                    r.id === selected.id ? 'bg-secondary-fixed/50' : 'hover:bg-[#FFF7F8]'
                  }`}
                >
                  <span className="w-9 h-9 rounded-full bg-secondary-container text-primary font-label-md text-label-md flex items-center justify-center shrink-0">
                    {initials(r.student)}
                  </span>
                  <span className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-space-sm">
                      <span className="font-title-sm text-title-sm text-on-surface truncate">{r.student}</span>
                      <span className="font-label-sm text-label-sm text-secondary whitespace-nowrap">{r.date}</span>
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">{r.prompt}</span>
                    <span className="pt-1 flex items-center gap-space-sm">
                      <StatusBadge status={r.state} />
                      {notes[r.id] && <Icon name="chat" className="text-[14px] text-secondary" />}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {list.length === 0 && (
              <li className="p-space-lg text-center font-body-sm text-body-sm text-secondary">No reflections in this category yet.</li>
            )}
          </ul>
        </section>

        <article className="lg:col-span-7 bg-surface-container-lowest rounded-3xl border border-[#EED4D7] shadow-sm p-space-lg md:p-space-xl flex flex-col gap-space-lg lg:sticky lg:top-24">
          <div className="flex flex-wrap items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-sm">
              <span className="w-11 h-11 rounded-full bg-primary text-on-primary font-title-sm text-title-sm flex items-center justify-center">
                {initials(selected.student)}
              </span>
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">{selected.student}</h2>
                <p className="font-body-sm text-body-sm text-secondary">
                  {selected.cohort} · {selected.date}
                </p>
              </div>
            </div>
            <StatusBadge status={selected.state} />
          </div>
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
              Prompt · <em className="normal-case not-italic text-primary">{selected.concept}</em>
            </span>
            <p className="font-title-md text-title-md text-on-surface mt-1">{selected.prompt}</p>
          </div>
          <blockquote className="bg-[#FFF7F8] rounded-2xl p-space-lg font-headline-sm text-headline-sm italic text-primary leading-snug">
            “{selected.response}”
          </blockquote>

          {notes[selected.id] ? (
            <div className="flex gap-space-sm p-space-md rounded-xl bg-surface-container-low">
              <Icon name="chat" className="text-[18px] text-primary mt-0.5" />
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Your note</span>
                <p className="font-body-md text-body-md text-on-surface">{notes[selected.id]}</p>
              </div>
            </div>
          ) : (
            <form
              className="flex flex-col gap-space-sm"
              onSubmit={(e) => {
                e.preventDefault()
                if (!draft.trim()) return
                setNotes((n) => ({ ...n, [selected.id]: draft.trim() }))
                setDraft('')
                notify(`Note shared with ${selected.student.split(' ')[0]}`, 'chat')
              }}
            >
              <label htmlFor="reflection-note" className="font-label-md text-label-md text-on-surface">
                Reply with an encouraging note
              </label>
              <textarea
                id="reflection-note"
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="What made you change your mind? Try testing it on the air table tomorrow…"
                className="w-full px-4 py-3 rounded-lg bg-surface-container-lowest border border-outline-variant font-body-md text-body-md focus:outline-none focus:border-tertiary-container focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="bg-primary hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed text-on-primary px-space-lg py-space-sm rounded-lg font-title-sm text-title-sm inline-flex items-center gap-space-xs"
                >
                  <Icon name="send" className="text-[18px]" />
                  Send note
                </button>
              </div>
            </form>
          )}
        </article>
      </div>
    </div>
  )
}
