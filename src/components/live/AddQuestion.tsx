import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../lib/db'
import { addLiveQuestion, type LiveQuestionInput, type LiveQuestionType } from '../../lib/liveDb'
import { parseNumber } from '../../lib/numbers'
import { Icon } from '../Icon'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field, inputClass } from '../ui/Field'
import { LETTERS } from './format'

type Props = { sessionId: string; open: boolean; onClose: () => void; onAdded: () => void }

/** A dialog for a quick question mid-class: pick answers or a number, say which is right, and it goes to the end of the list. */
export function AddQuestion({ sessionId, open, onClose, onAdded }: Props) {
  const [type, setType] = useState<LiveQuestionType>('multiple_choice')
  const [text, setText] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correct, setCorrect] = useState(0)
  const [number, setNumber] = useState('')
  const [tolerance, setTolerance] = useState('')
  const [unit, setUnit] = useState('')
  const [why, setWhy] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setText('')
    setOptions(['', '', '', ''])
    setCorrect(0)
    setNumber('')
    setTolerance('')
    setUnit('')
    setWhy('')
    setError(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const question = text.trim()
    if (!question) return setError('Type the question first.')

    let input: LiveQuestionInput
    if (type === 'numeric') {
      const answerNumber = parseNumber(number)
      if (answerNumber === null) return setError('Type the right answer as a number, like 9.8.')
      const toleranceText = tolerance.trim()
      const tol = toleranceText === '' ? null : parseNumber(toleranceText)
      if (toleranceText !== '' && (tol === null || tol < 0)) return setError('“Give or take” needs a number that isn’t negative, or leave it empty.')
      input = { type: 'numeric', text: question, answerNumber, tolerance: tol, unit: unit.trim(), why: why.trim() }
    } else {
      // Empty boxes are dropped; the right answer follows its text to the new position.
      const kept = options.map((o, i) => ({ text: o.trim(), i })).filter((o) => o.text !== '')
      if (kept.length < 2) return setError('Give at least two answers.')
      const answer = kept.findIndex((o) => o.i === correct)
      if (answer < 0) return setError('Pick which answer is right. It can’t be an empty one.')
      input = { type: 'multiple_choice', text: question, options: kept.map((o) => o.text), answer, why: why.trim() }
    }

    setSaving(true)
    try {
      await addLiveQuestion(sessionId, input)
      reset()
      onAdded()
    } catch (err) {
      console.error('Could not add the question', err)
      setError(errorMessage(err, 'We couldn’t add that question. Try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add a question">
      <form onSubmit={submit} className="mt-5 grid gap-5" noValidate>
        <div role="radiogroup" aria-label="Kind of question" className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F3F7FC] p-1.5">
          {(
            [
              ['multiple_choice', 'Pick an answer'],
              ['numeric', 'Type a number'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              onClick={() => setType(value)}
              className={`min-h-11 cursor-pointer rounded-xl font-inter text-[15px] font-semibold transition-colors ${type === value ? 'bg-navy text-white' : 'text-navy hover:bg-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <Field id="live-q-text" label="Question">
          <textarea id="live-q-text" rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} py-3`} placeholder="What happens to the speed of a ball thrown straight up, at the top?" />
        </Field>

        {type === 'multiple_choice' ? (
          <fieldset className="grid gap-3">
            <legend className="mb-1.5 font-inter text-[15px] font-semibold">Answers (tap the circle for the right one)</legend>
            {options.map((option, i) => (
              <div key={i} className="flex items-center gap-3">
                <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
                  <input type="radio" name="live-correct" checked={correct === i} onChange={() => setCorrect(i)} className="size-5 accent-[#161B26]" aria-label={`Answer ${LETTERS[i]} is right`} />
                </label>
                <input
                  value={option}
                  maxLength={200}
                  onChange={(e) => setOptions((o) => o.map((v, j) => (j === i ? e.target.value : v)))}
                  aria-label={`Answer ${LETTERS[i]}`}
                  placeholder={i < 2 ? `Answer ${LETTERS[i]}` : `Answer ${LETTERS[i]} (optional)`}
                  className={inputClass}
                />
              </div>
            ))}
          </fieldset>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="live-q-number" label="Right answer">
              <input id="live-q-number" inputMode="decimal" autoComplete="off" value={number} onChange={(e) => setNumber(e.target.value)} className={inputClass} placeholder="9.8" />
            </Field>
            <Field id="live-q-tol" label="Give or take" hint="Empty means 1%">
              <input id="live-q-tol" inputMode="decimal" autoComplete="off" value={tolerance} onChange={(e) => setTolerance(e.target.value)} className={inputClass} placeholder="0.1" />
            </Field>
            <Field id="live-q-unit" label="Unit">
              <input id="live-q-unit" maxLength={20} autoComplete="off" value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass} placeholder="m/s²" />
            </Field>
          </div>
        )}

        <Field id="live-q-why" label="Why it’s right (optional)" hint="Students see this when you show the answer.">
          <input id="live-q-why" maxLength={500} value={why} onChange={(e) => setWhy(e.target.value)} className={inputClass} />
        </Field>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#FBE1D8] px-4 py-3 font-inter text-[15px] leading-6 text-[#9C3412]">
            <Icon name="error" className="mt-0.5 text-[20px]" />
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="orange" icon={saving ? undefined : 'add'} disabled={saving}>
            {saving ? 'Adding…' : 'Add to the quiz'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
