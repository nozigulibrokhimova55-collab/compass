import { useEffect, useMemo, useRef, useState, type Ref } from 'react'
import { add, canSplitAt, hasErrors, mergeWithNext, remove, rename, setRange, splitAt, validate, type ChapterErrors } from '../../lib/materials/chapterEdit'
import { topLine } from '../../lib/materials/cleanText'
import { bodySize } from '../../lib/materials/findChapters'
import type { Chapter, DetectMethod, SourceDoc } from '../../lib/materials/types'
import { Icon } from '../Icon'
import { useToast } from '../Toast'
import { Button } from '../ui/Button'
import { Field, TextInput, inputClass } from '../ui/Field'
import { Frame } from '../ui/Frame'

type Props = {
  doc: SourceDoc
  method: DetectMethod
  initial: Chapter[]
  /** The rights box is already ticked, and saved: show a line instead of the box. */
  rightsConfirmed?: boolean
  /** A new file: also ask for its name and credit line. */
  details?: FileDetails
  /** Shown on the save button while saving, e.g. "Uploading the file…". */
  saving?: string | null
  onSave: (chapters: Chapter[], details: FileDetails) => void
  onCancel: () => void
  /** Heading ref, so the page can move focus here when the step opens. */
  headingRef?: Ref<HTMLHeadingElement>
}

export type FileDetails = { title: string; attribution: string }

const FOUND: Record<DetectMethod, string> = {
  outline: 'We used the file’s bookmarks.',
  headings: 'We used the chapter headings on the pages.',
  markdown: 'We split it at each “# ” heading.',
  text: 'We split it at each “Chapter” line.',
  none: '',
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const toNumber = (s: string) => (s.trim() === '' ? NaN : Number(s))

/** "Check the chapters": rename, change ranges, merge, split, delete and add, then save. */
export function ChapterEditor({ doc, method, initial, rightsConfirmed = false, details, saving = null, onSave, onCancel, headingRef }: Props) {
  const notify = useToast()
  const [chapters, setChapters] = useState<Chapter[]>(initial)
  const [rights, setRights] = useState(rightsConfirmed)
  const [title, setTitle] = useState(details?.title ?? '')
  const [attribution, setAttribution] = useState(details?.attribution ?? '')
  const [tried, setTried] = useState(false)
  const total = doc.pages.length
  const unit = doc.unit
  const body = useMemo(() => (doc.kind === 'pdf' ? bodySize(doc.pages) : 0), [doc])
  const errors = useMemo(() => validate(chapters, total, unit), [chapters, total, unit])
  const broken = hasErrors(errors)

  /** Puts the cursor in a new chapter's name once React has drawn it. */
  const focusLater = (id: string) => requestAnimationFrame(() => document.getElementById(`chapter-${id}-title`)?.focus())

  const addOne = () => {
    const next = add(chapters, total, `Chapter ${chapters.length + 1}`)
    const added = next.find((c) => !chapters.some((x) => x.id === c.id))
    setChapters(next)
    if (added) focusLater(added.id)
  }

  const save = () => {
    setTried(true)
    if (blocker || saving) return
    onSave(
      [...chapters].sort((a, b) => a.start - b.start).map((c) => ({ ...c, title: c.title.trim() })),
      { title: title.trim(), attribution: attribution.trim() },
    )
  }

  const blocker = details && !title.trim()
    ? 'Give the file a name.'
    : !chapters.length
    ? 'Add at least one chapter.'
    : broken
      ? 'Fix the chapters marked in orange first.'
      : !rights
        ? 'Tick the box to say you can use this material with AI tools.'
        : null

  return (
    <div className="step-in mt-8">
      <div className="flex flex-col gap-3 rounded-3xl bg-white/90 p-5 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <h2 ref={headingRef} tabIndex={-1} className="font-grotesk text-[26px] font-extrabold tracking-[-0.02em] outline-none">
            Check the chapters
          </h2>
          <p className="mt-1 max-w-[60ch] font-inter text-[15px] leading-6 text-navy">
            {method === 'none'
              ? 'We couldn’t find chapters in this file. Add them yourself.'
              : `We found ${plural(initial.length, 'chapter')}. ${FOUND[method]} Check each one against the book, and fix anything that looks off.`}
          </p>
        </div>
        <p className="break-all font-mono text-[12px] uppercase tracking-[0.12em] text-navy-soft">
          {doc.fileName} · {plural(total, unit)}
        </p>
      </div>

      {chapters.length > 0 && (
        <ol className="mt-6 flex flex-col gap-6" aria-label="Chapters">
          {chapters.map((c, i) => (
            <li key={c.id}>
              <ChapterRow
                chapter={c}
                index={i}
                isLast={i === chapters.length - 1}
                unit={unit}
                errors={errors[c.id] ?? {}}
                preview={Number.isInteger(c.start) && c.start >= 1 && c.start <= total ? topLine(doc, c.start, body) : ''}
                onRename={(title) => setChapters((l) => rename(l, c.id, title))}
                onRange={(patch) => setChapters((l) => setRange(l, c.id, patch))}
                onMerge={() => {
                  setChapters((l) => mergeWithNext(l, c.id))
                  notify('Chapters merged.', 'call_merge')
                }}
                onSplit={(page) => {
                  const next = splitAt(chapters, c.id, page)
                  setChapters(next)
                  const added = next.find((x) => !chapters.some((y) => y.id === x.id))
                  if (added) focusLater(added.id)
                }}
                onDelete={() => {
                  setChapters((l) => remove(l, c.id))
                  notify(`Removed ${c.title.trim() || 'the chapter'}.`, 'delete')
                }}
              />
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6">
        <Button variant="outline" icon="add" onClick={addOne}>
          Add a chapter
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-3xl bg-white/90 p-5 backdrop-blur-sm md:p-6">
        {details && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="file-title" label="Name of the book or file" error={tried && !title.trim() ? 'Give the file a name.' : undefined}>
              <TextInput id="file-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} error={tried && !title.trim() ? 'Give the file a name.' : undefined} />
            </Field>
            <Field id="file-credit" label="Credit line (optional)" hint="Shown on quizzes made from it. For example: Based on Conceptual Physics by Benjamin Crowell, CC BY-SA 3.0.">
              <TextInput id="file-credit" value={attribution} maxLength={300} onChange={(e) => setAttribution(e.target.value)} hint />
            </Field>
          </div>
        )}
        {rightsConfirmed ? (
          <p className="flex items-start gap-2 font-inter text-[15px] leading-6 text-navy">
            <Icon name="verified" className="mt-0.5 text-[20px] text-select" />
            You confirmed you have the right to use this material with AI tools.
          </p>
        ) : (
          <label className="flex min-h-11 cursor-pointer items-start gap-3 font-inter text-[15px] leading-6">
            <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#161B26]" />
            I have the right to use this material with AI tools.
          </label>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <Button variant="navy" icon={saving ? undefined : 'check'} onClick={save} disabled={(!!blocker && tried) || !!saving}>
              {saving ?? 'Save chapters'}
            </Button>
            <Button variant="outline" icon="arrow_back" onClick={onCancel} disabled={!!saving}>
              Back
            </Button>
          </div>
          {blocker && (
            <p role={tried ? 'alert' : undefined} className={`font-inter text-[14px] ${tried ? 'font-medium text-accent-strong' : 'text-navy-soft'}`}>
              {blocker}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

type RowProps = {
  chapter: Chapter
  index: number
  isLast: boolean
  unit: 'page' | 'line'
  errors: ChapterErrors
  preview: string
  onRename: (title: string) => void
  onRange: (patch: Partial<Pick<Chapter, 'start' | 'end'>>) => void
  onMerge: () => void
  onSplit: (page: number) => void
  onDelete: () => void
}

function ChapterRow({ chapter: c, index, isLast, unit, errors, preview, onRename, onRange, onMerge, onSplit, onDelete }: RowProps) {
  const [splitting, setSplitting] = useState(false)
  const [splitPage, setSplitPage] = useState('')
  const [splitError, setSplitError] = useState('')
  const splitRef = useRef<HTMLInputElement>(null)
  const base = `chapter-${c.id}`
  const count = Number.isInteger(c.start) && Number.isInteger(c.end) && c.end >= c.start ? c.end - c.start + 1 : null
  const Unit = unit === 'page' ? 'Page' : 'Line'

  useEffect(() => {
    if (splitting) splitRef.current?.focus()
  }, [splitting])

  const doSplit = () => {
    const page = toNumber(splitPage)
    if (!canSplitAt(c, page)) return setSplitError(`Pick a ${unit} from ${c.start + 1} to ${c.end}.`)
    onSplit(page)
    setSplitting(false)
    setSplitPage('')
    setSplitError('')
  }

  const action =
    'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 font-inter text-[14px] font-semibold text-navy transition-colors hover:bg-[#EEF4FB] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <Frame
      label={`ch${String(index + 1).padStart(2, '0')}.frame`}
      selected={!!(errors.title || errors.start || errors.end)}
      tabEnd={count !== null ? <span className="px-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-navy">{plural(count, unit)}</span> : undefined}
      bodyClassName="p-5 md:p-7"
    >
      <div className="flex flex-col gap-4">
        <Field id={`${base}-title`} label="Name" error={errors.title}>
          <TextInput id={`${base}-title`} value={c.title} onChange={(e) => onRename(e.target.value)} error={errors.title} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id={`${base}-start`} label={`First ${unit}`} error={errors.start}>
            <TextInput
              id={`${base}-start`}
              inputMode="numeric"
              value={Number.isNaN(c.start) ? '' : String(c.start)}
              onChange={(e) => onRange({ start: toNumber(e.target.value.replace(/\D/g, '')) })}
              error={errors.start}
            />
          </Field>
          <Field id={`${base}-end`} label={`Last ${unit}`} error={errors.end}>
            <TextInput
              id={`${base}-end`}
              inputMode="numeric"
              value={Number.isNaN(c.end) ? '' : String(c.end)}
              onChange={(e) => onRange({ end: toNumber(e.target.value.replace(/\D/g, '')) })}
              error={errors.end}
            />
          </Field>
        </div>
        {preview && (
          <div className="rounded-xl bg-[#F6F9FD] px-4 py-3">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-soft">
              {Unit} {c.start} starts with
            </p>
            <p className="mt-1 break-words font-inter text-[15px] leading-6 text-navy">{preview}</p>
          </div>
        )}

        {splitting && (
          <div className="flex flex-col gap-2 rounded-xl border-[1.5px] border-dashed border-select/60 p-4">
            <label htmlFor={`${base}-split`} className="font-inter text-[15px] font-semibold">
              New chapter starts on {unit}
            </label>
            <div className="flex flex-wrap gap-3">
              <input
                ref={splitRef}
                id={`${base}-split`}
                inputMode="numeric"
                value={splitPage}
                onChange={(e) => setSplitPage(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && doSplit()}
                aria-invalid={!!splitError}
                aria-describedby={splitError ? `${base}-split-error` : undefined}
                className={`${inputClass} w-28`}
              />
              <Button variant="navy" icon="call_split" onClick={doSplit}>
                Split
              </Button>
              <Button variant="outline" onClick={() => (setSplitting(false), setSplitError(''))}>
                Cancel
              </Button>
            </div>
            {splitError && (
              <p id={`${base}-split-error`} className="flex items-center gap-1 font-inter text-[14px] font-medium text-accent-strong">
                <Icon name="error" className="text-[16px]" />
                {splitError}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1 border-t border-dashed border-card-line pt-3">
          <button type="button" onClick={() => setSplitting(true)} disabled={splitting || count === null || count < 2} className={action}>
            <Icon name="call_split" className="text-[18px]" />
            Split
          </button>
          {!isLast && (
            <button type="button" onClick={onMerge} className={action}>
              <Icon name="call_merge" className="text-[18px]" />
              Merge with next
            </button>
          )}
          <button type="button" onClick={onDelete} className={`${action} text-accent-strong hover:bg-[#FBE1D8]`}>
            <Icon name="delete" className="text-[18px]" />
            Delete
          </button>
        </div>
      </div>
    </Frame>
  )
}
