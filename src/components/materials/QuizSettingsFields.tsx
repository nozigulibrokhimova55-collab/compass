import { COUNT_CHOICES, type QuestionType, type QuizSettings } from '../../lib/chapterQuizDb'
import { Chip } from '../ui/Chip'

const TYPES: { id: QuestionType; label: string }[] = [
  { id: 'multiple_choice', label: 'Multiple choice' },
  { id: 'numeric', label: 'Number answer' },
]
const DIFFICULTIES: { id: QuizSettings['difficulty']; label: string }[] = [
  { id: 'gentle', label: 'Gentle' },
  { id: 'medium', label: 'Medium' },
  { id: 'stretch', label: 'Stretch' },
]

/** How many questions (5 to 20), which kinds, and how hard. */
export function QuizSettingsFields({ value, onChange }: { value: QuizSettings; onChange: (next: QuizSettings) => void }) {
  const toggleType = (t: QuestionType) => {
    const has = value.types.includes(t)
    // Keep at least one kind picked.
    if (has && value.types.length === 1) return
    onChange({ ...value, types: has ? value.types.filter((x) => x !== t) : [...value.types, t] })
  }
  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-2 font-inter text-[15px] font-semibold">Questions</legend>
        <div className="flex flex-wrap gap-2">
          {COUNT_CHOICES.map((n) => (
            <Chip key={n} selected={value.count === n} onClick={() => onChange({ ...value, count: n })}>
              {n}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 font-inter text-[15px] font-semibold">Kinds of question</legend>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Chip key={t.id} selected={value.types.includes(t.id)} onClick={() => toggleType(t.id)}>
              {t.label}
            </Chip>
          ))}
          <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-card-line bg-white/70 px-4 font-inter text-[15px] text-navy-soft">
            Short written
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em]">Coming later</span>
          </span>
        </div>
        <p className="mt-1.5 font-inter text-[14px] text-navy-soft">Number answers are marked right when they’re close enough.</p>
      </fieldset>
      <fieldset>
        <legend className="mb-2 font-inter text-[15px] font-semibold">Difficulty</legend>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <Chip key={d.id} selected={value.difficulty === d.id} onClick={() => onChange({ ...value, difficulty: d.id })}>
              {d.label}
            </Chip>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
