import { useState } from 'react'
import { pagesNote, type ChapterQuestion } from '../../lib/chapterQuizDb'
import { parseNumber } from '../../lib/numbers'
import { Icon } from '../Icon'
import { Button } from '../ui/Button'
import { Field, inputClass } from '../ui/Field'
import { Frame } from '../ui/Frame'

/** A question on the review screen. Notes quizzes use only the multiple choice fields and are always "approved". */
export type EditableQuestion = ChapterQuestion & { uid: number; editing: boolean; custom?: boolean; topicId: string }

export type QuestionPatch = Pick<EditableQuestion, 'text' | 'options' | 'answer' | 'why' | 'misconceptions' | 'answerNumber' | 'tolerance' | 'unit'>

type Props = {
  number: number
  draft: EditableQuestion
  /** A chapter quiz draft: show Approve, the source pages, the concept and the misconception notes. */
  chapter: boolean
  onEdit: () => void
  onSave: (patch: QuestionPatch) => void
  onCancel: () => void
  onRegenerate: () => void
  onDelete: () => void
  onToggleApprove?: () => void
  /** A new version of this question is being written. */
  busy?: boolean
}

const withUnit = (n: number | null, unit: string | null) => (n === null ? '' : `${n}${unit ? ` ${unit}` : ''}`)

/** One question in a `q01.frame`: read view with Approve, Edit, New version and Delete, or an inline editor. */
export function QuestionFrame(props: Props) {
  return props.draft.editing ? <QuestionEditor {...props} /> : <QuestionView {...props} />
}

function QuestionView({ number, draft, chapter, onEdit, onRegenerate, onDelete, onToggleApprove, busy }: Props) {
  const label = `q${String(number).padStart(2, '0')}.frame`
  const numeric = draft.type === 'numeric'
  const action =
    'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 font-inter text-[14px] font-semibold text-navy transition-colors hover:bg-[#EEF4FB] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50'
  const approved = draft.approved

  return (
    <Frame
      label={label}
      selected={chapter && approved}
      tabEnd={
        chapter ? (
          <span className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] ${approved ? 'bg-[#E3F5EA] text-[#1F5C35]' : 'bg-note text-[#6B3F0E]'}`}>
            {approved ? 'Approved' : 'Draft'}
          </span>
        ) : undefined
      }
      bodyClassName="p-5 md:p-7"
    >
      {chapter && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {draft.sourcePages.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F1FD] px-2.5 py-1 font-mono text-[12px] font-semibold text-navy">
              <Icon name="menu_book" className="text-[15px] text-select" />
              {pagesNote(draft.sourcePages)}
            </span>
          )}
          {draft.concept && <span className="rounded-full border border-card-line px-2.5 py-1 font-inter text-[13px] text-navy">{draft.concept}</span>}
          {numeric && <span className="rounded-full bg-[#EEF1F5] px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-navy">Number answer</span>}
        </div>
      )}
      <p className="font-inter text-[17px] font-semibold leading-7">
        <span className="mr-2 font-grotesk font-black text-accent-strong">{String(number).padStart(2, '0')}</span>
        {draft.text}
      </p>

      {numeric ? (
        <p className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border-[1.5px] border-[#1F6B3A] bg-[#E3F5EA] px-3 py-2.5 font-inter text-[15px] text-[#1F5C35]">
          <Icon name="check_circle" className="text-[18px]" filled />
          {withUnit(draft.answerNumber, draft.unit)}
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em]">
            {draft.tolerance !== null ? `Counts within ${draft.tolerance}` : 'Counts within 1%'}
          </span>
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {draft.options.map((o, i) => {
            const right = i === draft.answer
            const note = chapter && !right ? draft.misconceptions[i] : null
            return (
              <li
                key={i}
                className={`flex flex-col gap-1 rounded-xl border-[1.5px] px-3 py-2.5 font-inter text-[15px] ${right ? 'border-[#1F6B3A] bg-[#E3F5EA] text-[#1F5C35]' : 'border-card-line text-navy'}`}
              >
                <span className="flex items-center gap-2">
                  <Icon name={right ? 'check_circle' : 'radio_button_unchecked'} className="text-[18px]" filled={right} />
                  {o}
                  {right && <span className="ml-auto font-mono text-[11px] font-semibold uppercase tracking-[0.1em]">Answer</span>}
                </span>
                {note && <span className="pl-[26px] text-[13px] leading-5 text-navy-soft">Might pick it if: {note}</span>}
              </li>
            )
          })}
        </ul>
      )}
      {draft.why && (
        <p className="mt-4 font-inter text-[15px] leading-6 text-navy-soft">
          <span className="font-semibold text-navy">Why: </span>
          {draft.why}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-1 border-t border-dashed border-card-line pt-3">
        {chapter && onToggleApprove && (
          <button
            type="button"
            onClick={onToggleApprove}
            aria-pressed={approved}
            className={`${action} ${approved ? 'bg-[#E3F5EA] text-[#1F5C35] hover:bg-[#D3EEDD]' : 'border-[1.5px] border-navy'}`}
          >
            <Icon name={approved ? 'task_alt' : 'check'} className="text-[18px]" />
            {approved ? 'Approved' : 'Approve'}
          </button>
        )}
        <button type="button" onClick={onEdit} className={action}>
          <Icon name="edit" className="text-[18px]" />
          Edit
        </button>
        <button type="button" onClick={onRegenerate} disabled={busy} className={action}>
          <Icon name="autorenew" className="text-[18px]" />
          {busy ? 'Writing…' : 'New version'}
        </button>
        <button type="button" onClick={onDelete} className={`${action} text-accent-strong hover:bg-[#FBE1D8]`}>
          <Icon name="delete" className="text-[18px]" />
          Delete
        </button>
      </div>
    </Frame>
  )
}

function QuestionEditor({ number, draft, chapter, onSave, onCancel }: Props) {
  const numeric = draft.type === 'numeric'
  const [text, setText] = useState(draft.text)
  const [options, setOptions] = useState(draft.options.length >= 2 ? draft.options : ['', '', '', ''])
  const [notes, setNotes] = useState<string[]>(() => (draft.options.length >= 2 ? draft.options : ['', '', '', '']).map((_, i) => draft.misconceptions[i] ?? ''))
  const [answer, setAnswer] = useState(draft.answer)
  const [why, setWhy] = useState(draft.why)
  const [answerNumber, setAnswerNumber] = useState(draft.answerNumber === null ? '' : String(draft.answerNumber))
  const [unit, setUnit] = useState(draft.unit ?? '')
  const [tolerance, setTolerance] = useState(draft.tolerance === null ? '' : String(draft.tolerance))
  const [error, setError] = useState('')
  const base = `q-${draft.uid}`

  const save = () => {
    if (!text.trim()) return setError('Write the question first.')
    if (numeric) {
      const n = parseNumber(answerNumber)
      if (n === null) return setError('The answer has to be a number.')
      const tol = tolerance.trim() ? parseNumber(tolerance) : null
      if (tolerance.trim() && (tol === null || tol < 0)) return setError('“Close enough” has to be a number, 0 or more.')
      return onSave({ text: text.trim(), options: [], answer: 0, why: why.trim(), misconceptions: [], answerNumber: n, tolerance: tol, unit: unit.trim() || null })
    }
    const filled = options.map((o) => o.trim())
    if (filled.filter(Boolean).length < 2) return setError('Add at least two answer choices.')
    if (!filled[answer]) return setError('The right answer needs some text.')
    const keep = filled.map((o, i) => (o ? i : -1)).filter((i) => i >= 0)
    onSave({
      text: text.trim(),
      options: keep.map((i) => filled[i]),
      answer: keep.indexOf(answer),
      why: why.trim(),
      misconceptions: keep.map((i) => (i === answer ? null : notes[i].trim() || null)),
      answerNumber: null,
      tolerance: null,
      unit: null,
    })
  }

  return (
    <Frame label={`q${String(number).padStart(2, '0')}.frame`} selected bodyClassName="p-5 md:p-7">
      <div className="flex flex-col gap-4">
        <Field id={`${base}-text`} label={`Question ${number}`}>
          <textarea id={`${base}-text`} rows={2} value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} resize-y py-3 leading-6`} />
        </Field>
        {numeric ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field id={`${base}-number`} label="Right answer">
              <input id={`${base}-number`} inputMode="decimal" value={answerNumber} onChange={(e) => setAnswerNumber(e.target.value)} className={inputClass} />
            </Field>
            <Field id={`${base}-unit`} label="Unit (optional)">
              <input id={`${base}-unit`} value={unit} maxLength={40} onChange={(e) => setUnit(e.target.value)} placeholder="m/s" className={inputClass} />
            </Field>
            <Field id={`${base}-tol`} label="Close enough within" hint="Empty means 1%.">
              <input id={`${base}-tol`} inputMode="decimal" value={tolerance} onChange={(e) => setTolerance(e.target.value)} aria-describedby={`${base}-tol-hint`} className={inputClass} />
            </Field>
          </div>
        ) : (
          <fieldset>
            <legend className="mb-2 font-inter text-[15px] font-semibold">Answer choices (tick the right one)</legend>
            <div className="flex flex-col gap-3">
              {options.map((o, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name={`${base}-answer`}
                      checked={answer === i}
                      onChange={() => setAnswer(i)}
                      aria-label={`Choice ${i + 1} is the right answer`}
                      className="h-5 w-5 shrink-0 cursor-pointer accent-[#1F6B3A]"
                    />
                    <input value={o} onChange={(e) => setOptions((os) => os.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Choice ${i + 1}`} aria-label={`Choice ${i + 1}`} className={inputClass} />
                  </div>
                  {chapter && answer !== i && (
                    <input
                      value={notes[i] ?? ''}
                      onChange={(e) => setNotes((ns) => ns.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder="Why a student might pick this (optional)"
                      aria-label={`Why a student might pick choice ${i + 1}`}
                      maxLength={300}
                      className={`${inputClass} ml-8 w-[calc(100%-2rem)] text-[15px]`}
                    />
                  )}
                </div>
              ))}
            </div>
          </fieldset>
        )}
        <Field id={`${base}-why`} label="Why it’s right (students see this after answering)">
          <textarea id={`${base}-why`} rows={2} value={why} onChange={(e) => setWhy(e.target.value)} className={`${inputClass} resize-y py-3 leading-6`} />
        </Field>
        {error && (
          <p role="alert" className="flex items-center gap-1 font-inter text-[14px] font-medium text-accent-strong">
            <Icon name="error" className="text-[16px]" />
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button variant="navy" icon="check" onClick={save}>
            Save question
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Frame>
  )
}
