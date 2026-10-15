import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { BrowserWindow } from '../../components/ui/BrowserWindow'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { Field, inputClass } from '../../components/ui/Field'
import { Frame } from '../../components/ui/Frame'
import { PageNotice } from '../../components/ui/PageNotice'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { ShowcasePanel } from '../../components/ui/ShowcasePanel'
import { StatementCard } from '../../components/ui/StatementCard'
import { dueOptions } from '../../lib/attendance'
import { useClassData } from '../../lib/classData'
import { errorMessage, publishQuiz } from '../../lib/db'
import { QUESTION_BANK, QUIZZES, TOPICS, type Question } from '../../lib/sample'

type Stage = 'setup' | 'review' | 'published'
type Draft = Question & { uid: number; editing: boolean; custom?: boolean }
type Difficulty = 'gentle' | 'medium' | 'stretch'

const COUNTS = [3, 4, 5]
const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'gentle', label: 'Gentle' },
  { id: 'medium', label: 'Medium' },
  { id: 'stretch', label: 'Stretch' },
]
const SAMPLE_NOTES = `Newton’s first law: an object keeps doing what it’s doing (staying still, or moving at a steady speed in a straight line) unless a net force acts on it.
Demo: air table puck vs. block on sandpaper. Friction is what slows things down.
Common mistake: thinking a moving object needs a constant push to keep moving.`

let nextUid = 1

/** Questions for a topic first, then from the other topics, skipping ones already used. */
function pick(topicId: string, count: number, used: Set<string>) {
  const pool = [...QUESTION_BANK.filter((q) => q.topicId === topicId), ...QUESTION_BANK.filter((q) => q.topicId !== topicId)]
  return pool.filter((q) => !used.has(q.id)).slice(0, count)
}

const STEPS: { id: Stage; label: string }[] = [
  { id: 'setup', label: 'Notes' },
  { id: 'review', label: 'Review' },
  { id: 'published', label: 'Publish' },
]

export default function TeacherQuizzes() {
  const notify = useToast()
  const { isDemo, loading, error, cls, quizzes, reload } = useClassData()
  const [params] = useSearchParams()
  const fromLink = TOPICS.find((t) => t.id === params.get('topic'))?.id

  const [stage, setStage] = useState<Stage>('setup')
  const [notes, setNotes] = useState('')
  const [fileName, setFileName] = useState('')
  const [topic, setTopic] = useState(fromLink ?? TOPICS[0].id)
  const [count, setCount] = useState(4)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [generating, setGenerating] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [title, setTitle] = useState('')
  const dueChoices = useMemo(() => dueOptions(), [])
  const [due, setDue] = useState(dueChoices[0].value)
  const [checked, setChecked] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const reviewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (stage !== 'setup') reviewRef.current?.focus()
  }, [stage])

  if (loading) return <p className="pt-24 text-center font-inter text-[15px] text-navy">Loading…</p>
  if (error) {
    return (
      <PageNotice label="error.frame" title="We couldn’t load your class" alert>
        {error}
      </PageNotice>
    )
  }
  if (!cls) {
    return (
      <PageNotice label="class.frame" title="No class yet">
        We couldn’t find a class for your account.
      </PageNotice>
    )
  }

  const topicName = TOPICS.find((t) => t.id === topic)?.name ?? ''
  const canGenerate = (notes.trim().length > 0 || fileName) && !generating
  const editingAny = drafts.some((d) => d.editing)
  const dueLabel = dueChoices.find((d) => d.value === due)?.label ?? due
  // In the demo, Quizzes 2 to 4 exist, so the new one is Quiz 5.
  const nextNumber = isDemo ? QUIZZES.length + 2 : quizzes.length + 1

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    // Plain text files are read in; other formats just show their name in this demo.
    if (/\.(txt|md)$/i.test(file.name)) file.text().then((t) => setNotes(t.slice(0, 4000)))
  }

  const generate = () => {
    setGenerating(true)
    window.setTimeout(() => {
      setDrafts(pick(topic, count, new Set()).map((q) => ({ ...q, uid: nextUid++, editing: false })))
      setTitle(`Quiz ${nextNumber}: ${topicName}`)
      setGenerating(false)
      setChecked(false)
      setStage('review')
    }, 900)
  }

  const update = (uid: number, patch: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.uid === uid ? { ...d, ...patch } : d)))
  const remove = (uid: number) => {
    setDrafts((ds) => ds.filter((d) => d.uid !== uid))
    notify('Question removed.', 'delete')
  }
  const regenerate = (uid: number) => {
    const fresh = pick(topic, 1, new Set(drafts.map((d) => d.id)))[0]
    if (!fresh) return notify('No more sample questions to swap in.', 'info')
    setDrafts((ds) => ds.map((d) => (d.uid === uid ? { ...fresh, uid, editing: false } : d)))
    notify('Swapped in a new question.', 'autorenew')
  }
  const addOwn = () =>
    setDrafts((ds) => [...ds, { id: `own-${nextUid}`, uid: nextUid++, topicId: topic, text: '', options: ['', '', '', ''], answer: 0, why: '', editing: true, custom: true }])

  const publish = async () => {
    setPublishing(true)
    try {
      if (!isDemo) {
        await publishQuiz({
          classId: cls.id,
          title: title.trim(),
          topicId: topic,
          dueDate: due,
          questions: drafts.map((d) => ({ topicId: d.topicId, text: d.text, options: d.options, answer: d.answer, why: d.why })),
        })
        await reload()
      }
      setStage('published')
      notify(`${title.trim()} is saved for ${cls.name}.`)
    } catch (err) {
      console.error('Could not publish the quiz', err)
      notify(errorMessage(err, 'We couldn’t publish the quiz. Try again.'), 'error')
    } finally {
      setPublishing(false)
    }
  }
  const restart = () => {
    setStage('setup')
    setDrafts([])
    setChecked(false)
  }

  const stageIndex = STEPS.findIndex((s) => s.id === stage)

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="fresh from your notes" title="Make a quiz" />

      <ol className="mt-8 flex flex-wrap gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            aria-current={i === stageIndex ? 'step' : undefined}
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] ${
              i === stageIndex ? 'bg-navy text-white' : i < stageIndex ? 'bg-white text-navy' : 'bg-white/70 text-navy-soft'
            }`}
          >
            {i < stageIndex ? <Icon name="check" className="text-[16px]" /> : <span>0{i + 1}</span>}
            {s.label}
          </li>
        ))}
      </ol>

      {stage === 'setup' && (
        <ShowcasePanel
          as="h2"
          number={1}
          title="Start from"
          highlight="your lesson notes"
          className="step-in mt-8"
          text={
            <>
              <p>Paste what you taught or upload a file. Pick a topic, how many questions, and how hard. You’ll check every question before students see anything.</p>
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-note px-4 py-3 font-inter text-[15px] leading-6 text-navy">
                <Icon name="science" className="mt-0.5 text-[20px]" />
                For now, questions come from a small sample set about Newton’s laws.
              </p>
            </>
          }
        >
          <div className="flex flex-col gap-6">
            <Field id="quiz-notes" label="Lesson notes" hint="A few lines is enough.">
              <textarea
                id="quiz-notes"
                aria-describedby="quiz-notes-hint"
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste your notes here"
                className={`${inputClass} resize-y py-3 leading-6`}
              />
            </Field>
            <div className="-mt-2 flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-select/60 bg-[#F2F8FE] px-4 font-inter text-[15px] font-semibold text-navy transition-colors hover:border-select has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-select">
                <Icon name="upload_file" className="text-[20px] text-select" />
                Upload a file
                <input type="file" accept=".txt,.md,.pdf,.doc,.docx" onChange={onFile} className="sr-only" />
              </label>
              <button type="button" onClick={() => setNotes(SAMPLE_NOTES)} className="min-h-11 cursor-pointer px-1 font-inter text-[15px] font-semibold text-accent-strong underline-offset-4 hover:underline">
                Use sample notes
              </button>
              {fileName && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-card-line bg-white px-2.5 py-1.5 font-mono text-[12px]">
                  <Icon name="description" className="text-[16px] text-select" />
                  {fileName}
                </span>
              )}
            </div>

            <fieldset>
              <legend className="mb-2 font-inter text-[15px] font-semibold">Topic</legend>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <Chip key={t.id} selected={topic === t.id} onClick={() => setTopic(t.id)}>
                    {t.name}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap gap-x-10 gap-y-6">
              <fieldset>
                <legend className="mb-2 font-inter text-[15px] font-semibold">Questions</legend>
                <div className="flex gap-2">
                  {COUNTS.map((n) => (
                    <Chip key={n} selected={count === n} onClick={() => setCount(n)}>
                      {n}
                    </Chip>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 font-inter text-[15px] font-semibold">Difficulty</legend>
                <div className="flex gap-2">
                  {DIFFICULTIES.map((d) => (
                    <Chip key={d.id} selected={difficulty === d.id} onClick={() => setDifficulty(d.id)}>
                      {d.label}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-card-line pt-5">
              <Button variant="orange" size="lg" icon={generating ? undefined : 'auto_awesome'} onClick={generate} disabled={!canGenerate}>
                {generating ? 'Writing questions…' : 'Make questions'}
              </Button>
              {!notes.trim() && !fileName && <p className="font-inter text-[14px] text-navy-soft">Add notes or a file first.</p>}
            </div>
          </div>
        </ShowcasePanel>
      )}

      {stage === 'review' && (
        <div className="step-in mt-8">
          <div ref={reviewRef} tabIndex={-1} className="flex flex-col gap-4 rounded-3xl bg-white/90 p-5 outline-none backdrop-blur-sm md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <h2 className="font-grotesk text-[26px] font-extrabold tracking-[-0.02em]">Check every question</h2>
              <p className="mt-1 flex items-center gap-2 font-inter text-[15px] text-navy">
                <Icon name="lock" className="text-[18px] text-accent-strong" />
                Draft. Students can’t see this quiz until you publish it.
              </p>
            </div>
            <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-navy-soft">
              {topicName} · {DIFFICULTIES.find((d) => d.id === difficulty)?.label} · {drafts.length} questions
            </p>
          </div>

          <ol className="mt-6 flex flex-col gap-6">
            {drafts.map((d, i) => (
              <li key={d.uid}>
                <QuestionFrame
                  key={`${d.id}-${d.editing}`}
                  number={i + 1}
                  draft={d}
                  onEdit={() => update(d.uid, { editing: true })}
                  onSave={(patch) => update(d.uid, { ...patch, editing: false, custom: false })}
                  onCancel={() => (d.custom ? setDrafts((ds) => ds.filter((x) => x.uid !== d.uid)) : update(d.uid, { editing: false }))}
                  onRegenerate={() => regenerate(d.uid)}
                  onDelete={() => remove(d.uid)}
                />
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" icon="add" onClick={addOwn}>
                Add your own question
              </Button>
              <Button variant="outline" icon="tune" onClick={() => setStage('setup')}>
                Change settings
              </Button>
            </div>
          </div>

          <ShowcasePanel
            as="h2"
            number={3}
            title="Review and"
            highlight="publish"
            className="mt-12"
            text={
              <div className="flex flex-col gap-5">
                <Field id="quiz-title" label="Quiz name">
                  <input id="quiz-title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
                </Field>
                <fieldset>
                  <legend className="mb-2 font-inter text-[15px] font-semibold">Due</legend>
                  <div className="flex flex-wrap gap-2">
                    {dueChoices.map((choice) => (
                      <Chip key={choice.value} icon="event" selected={due === choice.value} onClick={() => setDue(choice.value)}>
                        {choice.label}
                      </Chip>
                    ))}
                  </div>
                </fieldset>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 font-inter text-[15px] leading-6">
                  <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#161B26]" />
                  I’ve read every question and the answers are right.
                </label>
                <div>
                  <Button variant="orange" size="lg" icon={publishing ? undefined : 'send'} onClick={publish} disabled={!checked || editingAny || drafts.length === 0 || !title.trim() || publishing}>
                    {publishing ? 'Publishing…' : `Publish to ${cls.name}`}
                  </Button>
                  {(editingAny || drafts.length === 0) && (
                    <p className="mt-2 font-inter text-[14px] text-navy-soft">{drafts.length === 0 ? 'Add at least one question first.' : 'Save or cancel the question you’re editing first.'}</p>
                  )}
                </div>
              </div>
            }
          >
            <BrowserWindow url="compass.app/student/quiz">
              <div className="rounded-xl border border-card-line bg-white p-4">
                <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-navy-soft">What students will see · Due {dueLabel}</p>
                <p className="mt-2 font-grotesk text-[20px] font-extrabold leading-6 tracking-[-0.01em]">{title || 'Untitled quiz'}</p>
                <p className="mt-1 font-inter text-[14px] text-navy-soft">{drafts.length} questions · one at a time</p>
                {drafts[0] && (
                  <div className="mt-4 rounded-lg bg-[#F6F9FD] p-3">
                    <p className="font-inter text-[15px] font-semibold leading-6">1. {drafts[0].text || 'Your question'}</p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {drafts[0].options.filter(Boolean).map((o) => (
                        <li key={o} className="flex items-center gap-2 rounded-md border border-card-line bg-white px-2.5 py-1.5 font-inter text-[14px]">
                          <Icon name="radio_button_unchecked" className="text-[16px] text-navy-soft" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </BrowserWindow>
          </ShowcasePanel>
        </div>
      )}

      {stage === 'published' && (
        <div ref={reviewRef} tabIndex={-1} className="step-in mt-8 grid gap-6 outline-none lg:grid-cols-[1.4fr_1fr]">
          <StatementCard
            as="h2"
            title={isDemo ? `${title} is live for` : `${title} is live for`}
            highlight={`${cls.name}.`}
            footer={[`${drafts.length} questions`, `Due ${dueLabel}`]}
          >
            <p>
              {isDemo
                ? 'Students will see it in their quiz list. You’ll get a summary of what they found tricky once a few have finished.'
                : 'Your students can take it from their Quizzes page now. You will see their scores on your Overview.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="navy" icon="add" onClick={restart}>
                Make another quiz
              </Button>
              <Button variant="outline" to="/teacher">
                Back to overview
              </Button>
            </div>
          </StatementCard>
        </div>
      )}
    </>
  )
}

type QuestionFrameProps = {
  number: number
  draft: Draft
  onEdit: () => void
  onSave: (patch: Pick<Draft, 'text' | 'options' | 'answer' | 'why'>) => void
  onCancel: () => void
  onRegenerate: () => void
  onDelete: () => void
}

/** One generated question in a frame: read view with actions, or an inline editor. */
function QuestionFrame({ number, draft, onEdit, onSave, onCancel, onRegenerate, onDelete }: QuestionFrameProps) {
  const [text, setText] = useState(draft.text)
  const [options, setOptions] = useState(draft.options)
  const [answer, setAnswer] = useState(draft.answer)
  const [why, setWhy] = useState(draft.why)
  const [error, setError] = useState('')
  const label = `q${String(number).padStart(2, '0')}.frame`
  const base = `q-${draft.uid}`
  // The parent keys this component by question and edit state, so the editor starts fresh each time.

  if (draft.editing) {
    const save = () => {
      const filled = options.map((o) => o.trim())
      if (!text.trim()) return setError('Write the question first.')
      if (filled.filter(Boolean).length < 2) return setError('Add at least two answer choices.')
      if (!filled[answer]) return setError('Pick a choice that has text as the right answer.')
      onSave({ text: text.trim(), options: filled.filter(Boolean), answer: filled.slice(0, answer).filter(Boolean).length, why: why.trim() })
    }
    return (
      <Frame label={label} selected bodyClassName="p-5 md:p-7">
        <div className="flex flex-col gap-4">
          <Field id={`${base}-text`} label={`Question ${number}`}>
            <textarea id={`${base}-text`} rows={2} value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} resize-y py-3 leading-6`} />
          </Field>
          <fieldset>
            <legend className="mb-2 font-inter text-[15px] font-semibold">Answer choices (pick the right one)</legend>
            <div className="flex flex-col gap-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={`${base}-answer`}
                    checked={answer === i}
                    onChange={() => setAnswer(i)}
                    aria-label={`Choice ${i + 1} is the right answer`}
                    className="h-5 w-5 shrink-0 cursor-pointer accent-[#1F6B3A]"
                  />
                  <input
                    value={o}
                    onChange={(e) => setOptions((os) => os.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder={`Choice ${i + 1}`}
                    aria-label={`Choice ${i + 1}`}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </fieldset>
          <Field id={`${base}-why`} label="Why it’s right (shown after students answer)">
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

  const action =
    'inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-3 font-inter text-[14px] font-semibold text-navy transition-colors hover:bg-[#EEF4FB] active:scale-[0.96]'
  return (
    <Frame label={label} bodyClassName="p-5 md:p-7">
      <p className="font-inter text-[17px] font-semibold leading-7">
        <span className="mr-2 font-grotesk font-black text-accent-strong">{String(number).padStart(2, '0')}</span>
        {draft.text}
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {draft.options.map((o, i) => {
          const right = i === draft.answer
          return (
            <li
              key={i}
              className={`flex items-center gap-2 rounded-xl border-[1.5px] px-3 py-2.5 font-inter text-[15px] ${right ? 'border-[#1F6B3A] bg-[#E3F5EA] text-[#1F5C35]' : 'border-card-line text-navy'}`}
            >
              <Icon name={right ? 'check_circle' : 'radio_button_unchecked'} className="text-[18px]" filled={right} />
              {o}
              {right && <span className="ml-auto font-mono text-[11px] font-semibold uppercase tracking-[0.1em]">Answer</span>}
            </li>
          )
        })}
      </ul>
      {draft.why && (
        <p className="mt-4 font-inter text-[15px] leading-6 text-navy-soft">
          <span className="font-semibold text-navy">Why: </span>
          {draft.why}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-1 border-t border-dashed border-card-line pt-3">
        <button type="button" onClick={onEdit} className={action}>
          <Icon name="edit" className="text-[18px]" />
          Edit
        </button>
        <button type="button" onClick={onRegenerate} className={action}>
          <Icon name="autorenew" className="text-[18px]" />
          New version
        </button>
        <button type="button" onClick={onDelete} className={`${action} text-accent-strong hover:bg-[#FBE1D8]`}>
          <Icon name="delete" className="text-[18px]" />
          Delete
        </button>
      </div>
    </Frame>
  )
}
