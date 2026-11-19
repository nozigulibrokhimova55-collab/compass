import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useClassGate } from '../../components/area/classGate'
import { Icon } from '../../components/Icon'
import { ChapterEditor, type FileDetails } from '../../components/materials/ChapterEditor'
import { QuestionFrame, type EditableQuestion, type QuestionPatch } from '../../components/materials/QuestionFrame'
import { QuizSettingsFields } from '../../components/materials/QuizSettingsFields'
import { useToast } from '../../components/Toast'
import { BrowserWindow } from '../../components/ui/BrowserWindow'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { Field, inputClass, TextInput } from '../../components/ui/Field'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { ShowcasePanel } from '../../components/ui/ShowcasePanel'
import { StatementCard } from '../../components/ui/StatementCard'
import { dueOptions } from '../../lib/attendance'
import {
  ChapterQuizzesNotSetUpError,
  DEFAULT_SETTINGS,
  deleteDraft,
  fetchDraft,
  fetchDrafts,
  generateChapterQuestions,
  MAX_FOCUS,
  publishQuizDraft,
  saveQuizDraft,
  type ChapterQuestion,
  type DraftSummary,
  type QuizSettings,
} from '../../lib/chapterQuizDb'
import { useClassData } from '../../lib/classData'
import { errorMessage } from '../../lib/db'
import { charsPerPage, docFromSavedPages, docFromText } from '../../lib/materials/extract'
import { detectChapters } from '../../lib/materials/findChapters'
import { MAX_FILE_BYTES, readPdf, ReadError } from '../../lib/materials/readPdf'
import type { Chapter, DetectMethod, SourceDoc } from '../../lib/materials/types'
import {
  fetchMaterial,
  fetchMaterials,
  fetchPageTexts,
  MaterialsNotSetUpError,
  registerMaterialBook,
  saveMaterial,
  saveMaterialChapters,
  unitOf,
  type Material,
  type MaterialChapter,
  type SaveStep,
} from '../../lib/materialsDb'

type Stage = 'start' | 'chapters' | 'questions' | 'publish' | 'done'
/** A file read in on this visit and not saved yet, with the chapters found in it. */
type Fresh = { file: File; doc: SourceDoc; method: DetectMethod; detected: Chapter[] }
/** The book the quiz comes from: a saved file and its chapters, in page order. */
type Book = { material: Material; chapters: MaterialChapter[] }
/** What the chapter editor is open on: a new file (materialId null) or a saved one being re-checked. */
type Editing = { doc: SourceDoc; method: DetectMethod; initial: Chapter[]; materialId: string | null; title: string }
type DraftStatus = { state: 'idle' | 'saving' | 'saved' } | { state: 'error'; message: string }

const SAVE_LABEL: Record<SaveStep, string> = { uploading: 'Uploading the file…', saving: 'Saving the chapters…' }
const STEPS: { id: Exclude<Stage, 'done' | 'chapters'>; label: string }[] = [
  { id: 'start', label: 'Chapter' },
  { id: 'questions', label: 'Questions' },
  { id: 'publish', label: 'Review and publish' },
]

let nextUid = 1
const toEditable = (qs: ChapterQuestion[]): EditableQuestion[] => qs.map((q) => ({ ...q, uid: nextUid++, editing: false, topicId: '' }))
const toChapterQuestion = ({ uid: _uid, editing: _editing, custom: _custom, topicId: _topic, ...q }: EditableQuestion): ChapterQuestion => q
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export default function TeacherQuizzes() {
  const gate = useClassGate()
  return gate ?? <QuizMaker />
}

function QuizMaker() {
  const notify = useToast()
  const { cls, reload } = useClassData()
  const [params] = useSearchParams()

  const [stage, setStage] = useState<Stage>('start')
  // Start: a chapter of an uploaded book, and what to cover
  const [materials, setMaterials] = useState<Material[] | null>(null)
  const [materialsError, setMaterialsError] = useState<string | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [chapterNumber, setChapterNumber] = useState('')
  const [focus, setFocus] = useState('')
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS)
  const [tried, setTried] = useState(false)
  // Uploading a new book
  const [fileNote, setFileNote] = useState<string | null>(null)
  const [fresh, setFresh] = useState<Fresh | null>(null)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [reading, setReading] = useState<{ done: number; total: number } | null>(null)
  const [busyNote, setBusyNote] = useState<string | null>(null)
  const [savedDrafts, setSavedDrafts] = useState<DraftSummary[] | null>(null)
  // Questions
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [swapping, setSwapping] = useState<number | null>(null)
  const [drafts, setDrafts] = useState<EditableQuestion[]>([])
  const [draftId, setDraftId] = useState<string | null>(null)
  /** The chapter the open draft belongs to (fixed once questions are written). */
  const [draftChapter, setDraftChapter] = useState<MaterialChapter | null>(null)
  const [draftStatus, setDraftStatus] = useState<DraftStatus>({ state: 'idle' })
  // Publish
  const [title, setTitle] = useState('')
  const dueChoices = useMemo(() => dueOptions(), [])
  const [due, setDue] = useState(dueChoices[0].value)
  const [checked, setChecked] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishedCount, setPublishedCount] = useState(0)

  const stageHeading = useRef<HTMLHeadingElement>(null)
  const doneRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)
  /** Draft saves run one after another, each saving the newest list, so a slow save can't undo a newer one. */
  const saveChain = useRef<Promise<void>>(Promise.resolve())
  const latest = useRef<{ questions: EditableQuestion[]; title: string }>({ questions: [], title: '' })

  useEffect(() => {
    // Move focus to the new step's heading so keyboard and screen reader users land in the right place.
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    ;(stage === 'done' ? doneRef.current : stageHeading.current)?.focus()
  }, [stage])

  const classId = cls?.id

  // The class's uploaded books. The newest one is picked unless a link already picked one.
  useEffect(() => {
    if (!classId) return
    let live = true
    ;(async () => {
      try {
        const list = await fetchMaterials(classId)
        if (!live) return
        setMaterials(list)
        if (list.length) {
          const found = await fetchMaterial(list[0].id)
          if (live && found) setBook((current) => current ?? found)
        }
      } catch (err) {
        if (!(err instanceof MaterialsNotSetUpError)) console.error('Could not load the books', err)
        if (live) {
          setMaterials([])
          setMaterialsError(errorMessage(err, 'We couldn’t load your books.'))
        }
      }
    })()
    return () => {
      live = false
    }
  }, [classId])

  useEffect(() => {
    if (!classId) return
    let live = true
    fetchDrafts(classId)
      .then((list) => live && setSavedDrafts(list))
      .catch((err) => {
        // Before the chapter quiz migration there are no drafts to show.
        if (!(err instanceof ChapterQuizzesNotSetUpError)) console.error('Could not load drafts', err)
        if (live) setSavedDrafts([])
      })
    return () => {
      live = false
    }
  }, [classId])
  /** Reloads the drafts list after something changed it. */
  const loadDrafts = (id: string) =>
    fetchDrafts(id)
      .then(setSavedDrafts)
      .catch((err) => console.error('Could not reload drafts', err))

  // Opened from a file page: ?material=…&chapter=… picks that chapter; ?draft=… opens a saved draft.
  const linkMaterial = params.get('material')
  const linkChapter = params.get('chapter')
  const linkDraft = params.get('draft')
  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        if (linkDraft) {
          const draft = await fetchDraft(linkDraft)
          if (!live) return
          if (!draft) return setFileNote('That draft is gone, or it was already published.')
          const found = draft.materialId ? await fetchMaterial(draft.materialId) : null
          const index = found?.chapters.findIndex((c) => c.id === draft.chapterId) ?? -1
          if (!live || !found || index < 0) return
          const qs = toEditable(draft.questions)
          setBook(found)
          setChapterNumber(String(index + 1))
          setDraftChapter(found.chapters[index])
          setDraftId(draft.id)
          setTitle(draft.title)
          setDrafts(qs)
          latest.current = { questions: qs, title: draft.title }
          setDraftStatus({ state: 'saved' })
          setStage('questions')
        } else if (linkMaterial) {
          const found = await fetchMaterial(linkMaterial)
          if (!live || !found) return
          setBook(found)
          const index = found.chapters.findIndex((c) => c.id === linkChapter)
          if (index >= 0) setChapterNumber(String(index + 1))
        }
      } catch (err) {
        console.error('Could not open the link', err)
        if (live) setFileNote(errorMessage(err, 'We couldn’t open that. Try again.'))
      }
    })()
    return () => {
      live = false
    }
  }, [linkMaterial, linkChapter, linkDraft])

  if (!cls) return null

  // The typed chapter number, matched to the book's chapters in page order.
  const total = book?.chapters.length ?? 0
  const typed = Number(chapterNumber)
  const picked = book && Number.isInteger(typed) && typed >= 1 && typed <= total ? book.chapters[typed - 1] : null
  const numberError = !book ? null : !chapterNumber.trim() ? 'Type a chapter number.' : picked ? null : `This book has ${plural(total, 'chapter')}. Type a number from 1 to ${total}.`
  const chapter = stage === 'start' || stage === 'chapters' ? picked : (draftChapter ?? picked)
  const material = book?.material ?? null
  const unit = material ? unitOf(material.fileType) : 'page'
  const editingAny = drafts.some((d) => d.editing)
  const approved = drafts.filter((d) => d.approved)
  const dueLabel = dueChoices.find((d) => d.value === due)?.label ?? due
  // "Check the chapters" is part of the first step.
  const stageIndex = STEPS.findIndex((s) => s.id === (stage === 'chapters' ? 'start' : stage))

  // -------------------------------------------------------------------------
  // Books: pick one, upload a new one, re-check chapters
  // -------------------------------------------------------------------------

  const pickBook = async (id: string) => {
    if (id === book?.material.id) return
    setBusyNote('Opening the book…')
    try {
      const found = await fetchMaterial(id)
      if (found) setBook(found)
    } catch (err) {
      console.error('Could not open the book', err)
      notify(errorMessage(err, 'We couldn’t open that book. Try again.'), 'error')
    } finally {
      setBusyNote(null)
    }
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    input.value = '' // so picking the same file again still works
    if (!file) return
    const kind = /\.pdf$/i.test(file.name) ? 'pdf' : /\.md$/i.test(file.name) ? 'md' : /\.txt$/i.test(file.name) ? 'txt' : null
    setFileNote(null)
    if (!kind) return setFileNote('We can read .pdf, .md and .txt files.')
    if (file.size > MAX_FILE_BYTES) return setFileNote('This file is over 50 MB. Try a smaller file.')
    setFresh(null)
    try {
      let doc: SourceDoc
      if (kind === 'pdf') {
        setReading({ done: 0, total: 0 })
        doc = await readPdf(file, (done, n) => setReading({ done, total: n }))
        if (charsPerPage(doc) < 100) return setFileNote('This PDF looks scanned, so we can’t read its text. Try a PDF with selectable text.')
      } else {
        doc = docFromText(file.name, kind, await file.text())
      }
      const found = detectChapters(doc)
      const next: Fresh = { file, doc, method: found.method, detected: found.chapters }
      setFresh(next)
      openFresh(next)
    } catch (err) {
      console.error('Could not read the file', err)
      setFileNote(err instanceof ReadError ? err.message : 'We couldn’t read this file. Try another one.')
    } finally {
      setReading(null)
    }
  }

  const openFresh = (f: Fresh) => {
    setEditing({ doc: f.doc, method: f.method, initial: f.detected, materialId: null, title: f.file.name.replace(/\.(pdf|md|txt)$/i, '') })
    setStage('chapters')
  }

  /** Reopens the editor on the picked book, rebuilt from its saved page text. */
  const recheck = async () => {
    if (!book) return
    setBusyNote('Opening the chapters…')
    try {
      const { material: m, chapters } = book
      const doc = docFromSavedPages(m.title, m.fileType, await fetchPageTexts(m.id))
      setEditing({ doc, method: 'headings', initial: chapters, materialId: m.id, title: m.title })
      setStage('chapters')
    } catch (err) {
      console.error('Could not open the chapters', err)
      notify(errorMessage(err, 'We couldn’t open the chapters. Try again.'), 'error')
    } finally {
      setBusyNote(null)
    }
  }

  const saveChapters = async (chapters: Chapter[], details: FileDetails) => {
    if (!editing) return
    try {
      let id = editing.materialId
      if (id) {
        setSaving(SAVE_LABEL.saving)
        await saveMaterialChapters(id, chapters)
      } else {
        if (!fresh) return
        id = await saveMaterial({ classId: cls.id, file: fresh.file, doc: editing.doc, chapters, title: details.title, attribution: details.attribution, onStep: (step) => setSaving(SAVE_LABEL[step]) })
      }
      const found = await fetchMaterial(id)
      if (found) registerMaterialBook(found.material, found.chapters)
      setBook(found)
      setMaterials(await fetchMaterials(cls.id).catch(() => materials))
      setFresh(null)
      setEditing(null)
      setStage('start')
      notify(`Saved ${plural(chapters.length, 'chapter')}. Type a chapter number to make a quiz.`)
    } catch (err) {
      console.error('Could not save the chapters', err)
      notify(errorMessage(err, 'We couldn’t save the chapters. Try again.'), 'error')
    } finally {
      setSaving(null)
    }
  }

  // -------------------------------------------------------------------------
  // Drafts (saved after every change)
  // -------------------------------------------------------------------------

  const persist = (questions: EditableQuestion[]) => {
    latest.current = { ...latest.current, questions }
    if (!draftId || !draftChapter) return
    const quizId = draftId
    const chapterId = draftChapter.id
    setDraftStatus({ state: 'saving' })
    saveChain.current = saveChain.current.then(async () => {
      const now = latest.current
      // Questions still being written by hand aren't ready to save.
      const ready = now.questions.filter((q) => !(q.custom && q.editing))
      if (!ready.length || !now.title.trim()) return setDraftStatus({ state: 'saved' })
      try {
        await saveQuizDraft({ quizId, chapterId, title: now.title, questions: ready.map(toChapterQuestion) })
        setDraftStatus({ state: 'saved' })
      } catch (err) {
        console.error('Could not save the draft', err)
        setDraftStatus({ state: 'error', message: errorMessage(err, 'We couldn’t save the draft. Your next change tries again.') })
      }
    })
  }
  const change = (next: EditableQuestion[]) => {
    setDrafts(next)
    persist(next)
  }

  const openDraft = async (id: string) => {
    setBusyNote('Opening the draft…')
    try {
      const draft = await fetchDraft(id)
      if (!draft) {
        notify('That draft is gone, or it was already published.', 'error')
        loadDrafts(cls.id)
        return
      }
      const found = draft.materialId ? await fetchMaterial(draft.materialId) : null
      const index = found?.chapters.findIndex((c) => c.id === draft.chapterId) ?? -1
      if (!found || index < 0) return notify('The chapter this draft came from was removed.', 'error')
      const qs = toEditable(draft.questions)
      setBook(found)
      setChapterNumber(String(index + 1))
      setDraftChapter(found.chapters[index])
      setDraftId(draft.id)
      setTitle(draft.title)
      setDrafts(qs)
      latest.current = { questions: qs, title: draft.title }
      setDraftStatus({ state: 'saved' })
      setChecked(false)
      setStage('questions')
    } catch (err) {
      console.error('Could not open the draft', err)
      notify(errorMessage(err, 'We couldn’t open the draft. Try again.'), 'error')
    } finally {
      setBusyNote(null)
    }
  }

  const removeDraft = async (d: DraftSummary) => {
    try {
      await deleteDraft(d.id)
      notify(`Deleted the draft ${d.title}.`, 'delete')
      setSavedDrafts((list) => (list ?? []).filter((x) => x.id !== d.id))
    } catch (err) {
      console.error('Could not delete the draft', err)
      notify(errorMessage(err, 'We couldn’t delete the draft. Try again.'), 'error')
    }
  }

  // -------------------------------------------------------------------------
  // Questions
  // -------------------------------------------------------------------------

  const generate = async () => {
    setTried(true)
    if (!picked) return
    setGenerating(true)
    setGenError(null)
    try {
      const { questions, requested } = await generateChapterQuestions(picked.id, settings, [], focus)
      const name = `${picked.title} quiz`
      const id = await saveQuizDraft({ quizId: null, chapterId: picked.id, title: name, questions })
      const qs = toEditable(questions)
      setDraftId(id)
      setDraftChapter(picked)
      setTitle(name)
      setDrafts(qs)
      latest.current = { questions: qs, title: name }
      setDraftStatus({ state: 'saved' })
      if (questions.length < requested) notify(`We got ${questions.length} of ${requested} questions. The others didn’t pass our checks.`, 'info')
      loadDrafts(cls.id)
      setChecked(false)
      setStage('questions')
    } catch (err) {
      console.error('Could not write the questions', err)
      setGenError(errorMessage(err, 'We couldn’t write the questions. Try again.'))
    } finally {
      setGenerating(false)
    }
  }

  const update = (uid: number, patch: Partial<EditableQuestion>) => change(drafts.map((d) => (d.uid === uid ? { ...d, ...patch } : d)))
  const remove = (uid: number) => {
    change(drafts.filter((d) => d.uid !== uid))
    notify('Question removed.', 'delete')
  }
  const regenerate = async (uid: number) => {
    const old = drafts.find((d) => d.uid === uid)
    if (!old || !draftChapter) return
    setSwapping(uid)
    try {
      const exclude = drafts.map((d) => d.text).filter(Boolean)
      const [next] = toEditable((await generateChapterQuestions(draftChapter.id, { count: 1, types: [old.type], difficulty: settings.difficulty }, exclude, focus)).questions)
      // Read the list again: other changes may have happened while the new version was being written.
      setDrafts((ds) => {
        const list = ds.map((d) => (d.uid === uid ? { ...next, uid, editing: false } : d))
        persist(list)
        return list
      })
      notify('Here’s a new version of that question.', 'autorenew')
    } catch (err) {
      console.error('Could not write a new version', err)
      notify(errorMessage(err, 'We couldn’t write a new version. Try again.'), 'error')
    } finally {
      setSwapping(null)
    }
  }
  const addOwn = () =>
    setDrafts((ds) => [
      ...ds,
      { uid: nextUid++, topicId: '', type: 'multiple_choice', text: '', options: ['', '', '', ''], answer: 0, misconceptions: [], answerNumber: null, tolerance: null, unit: null, why: '', concept: '', sourcePages: [], approved: true, editing: true, custom: true },
    ])
  const saveQuestion = (uid: number, patch: QuestionPatch) => update(uid, { ...patch, editing: false, custom: false })
  const approveAll = () => change(drafts.map((d) => ({ ...d, approved: true })))

  // -------------------------------------------------------------------------
  // Publish
  // -------------------------------------------------------------------------

  const publish = async () => {
    if (!draftId || !draftChapter) return
    setPublishing(true)
    try {
      // Make sure the newest version of the draft is saved, then publish only what's approved.
      await saveChain.current
      await saveQuizDraft({ quizId: draftId, chapterId: draftChapter.id, title, questions: drafts.map(toChapterQuestion) })
      setPublishedCount(await publishQuizDraft(draftId, title, due))
      loadDrafts(cls.id)
      await reload()
      setStage('done')
      notify(`${title.trim()} is live for ${cls.name}.`)
    } catch (err) {
      console.error('Could not publish the quiz', err)
      notify(errorMessage(err, 'We couldn’t publish the quiz. Try again.'), 'error')
    } finally {
      setPublishing(false)
    }
  }
  const restart = () => {
    setStage('start')
    setDrafts([])
    setDraftId(null)
    setDraftChapter(null)
    setDraftStatus({ state: 'idle' })
    setChecked(false)
    setTried(false)
  }

  const heading = (text: string) => (
    <h2 ref={stageHeading} tabIndex={-1} className="break-words font-grotesk text-[26px] font-extrabold tracking-[-0.02em] outline-none">
      {text}
    </h2>
  )
  const credit = material?.attribution ? <Credit text={material.attribution} /> : null
  const preview = approved[0]
  const uploadLabel = (
    <label
      className={`inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-dashed border-select/60 bg-[#F2F8FE] px-4 font-inter text-[15px] font-semibold text-navy transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-select ${
        reading ? 'cursor-wait opacity-60' : 'cursor-pointer hover:border-select'
      }`}
    >
      <Icon name="upload_file" className="text-[20px] text-select" />
      {book ? 'Upload another book (PDF)' : 'Upload your book (PDF)'}
      <input type="file" accept=".pdf,.md,.txt,application/pdf,text/markdown,text/plain" onChange={onFile} disabled={!!reading} className="sr-only" />
    </label>
  )

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="fresh from the book" title="Make a quiz" />

      {stage !== 'done' && (
        <ol className="mt-8 flex flex-wrap gap-2" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              aria-current={i === stageIndex ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] ${
                i === stageIndex ? 'bg-navy text-white' : i < stageIndex ? 'bg-white text-navy' : 'bg-white/80 text-navy-soft'
              }`}
            >
              {i < stageIndex ? <Icon name="check" className="text-[16px]" /> : <span>0{i + 1}</span>}
              {s.label}
            </li>
          ))}
        </ol>
      )}

      {/* Step 1: a chapter number, what to cover, and the quiz settings */}
      {stage === 'start' && (
        <ShowcasePanel
          as="h2"
          number={1}
          title="Start from"
          highlight="a chapter"
          className="step-in mt-8"
          text={
            <>
              <p>Type the chapter number from your book and say what the quiz should cover. Questions come only from that chapter’s pages. You check every question before students see anything.</p>
              <p className="mt-4">Need a new book? Upload its PDF. Compass splits it into chapters, and you check them once.</p>
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-note px-4 py-3 font-inter text-[15px] leading-6 text-navy">
                <span className="mt-0.5 text-[#6B3F0E]">
                  <Icon name="info" className="text-[20px]" />
                </span>
                An AI model writes the questions from the chapter’s text and your description, so those are sent to the AI provider. Nothing else about your class is.
              </p>
            </>
          }
        >
          <div className="flex flex-col gap-6">
            {savedDrafts && savedDrafts.length > 0 && <DraftList drafts={savedDrafts} busy={!!busyNote} onOpen={openDraft} onDelete={removeDraft} />}

            {materials === null ? (
              <p role="status" className="font-inter text-[15px] text-navy">
                Loading your books…
              </p>
            ) : !book ? (
              <Frame label="book.frame" bodyClassName="flex flex-col items-start gap-3 p-5 md:p-6">
                <h3 className="font-grotesk text-[22px] font-extrabold leading-tight tracking-[-0.01em]">Upload your book first</h3>
                <p className="font-inter text-[15px] leading-6 text-navy-soft">
                  {materialsError ?? 'Upload the PDF your class uses. Compass splits it into chapters, you check them once, and then you just type a chapter number here.'}
                </p>
                {uploadLabel}
              </Frame>
            ) : (
              <>
                <Frame label="book.frame" bodyClassName="flex flex-col gap-3 p-4 md:p-5">
                  {materials.length > 1 ? (
                    <Field id="quiz-book" label="Book">
                      <select id="quiz-book" value={book.material.id} onChange={(e) => pickBook(e.target.value)} disabled={!!busyNote} className={`${inputClass} cursor-pointer`}>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    <div>
                      <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-navy-soft">Book</p>
                      <p className="break-words font-grotesk text-[20px] font-extrabold leading-tight tracking-[-0.01em]">{book.material.title}</p>
                    </div>
                  )}
                  <details className="group">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-inter text-[15px] font-semibold text-navy">
                      <Icon name="expand_more" className="text-[20px] transition-transform group-open:rotate-180" />
                      See all {plural(total, 'chapter')}
                    </summary>
                    <ol className="mt-1 flex flex-col divide-y divide-dashed divide-card-line">
                      {book.chapters.map((c, i) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setChapterNumber(String(i + 1))}
                            className="flex min-h-11 w-full cursor-pointer items-baseline gap-3 py-2 text-left font-inter text-[15px] hover:text-accent-strong"
                          >
                            <span className="w-7 shrink-0 font-mono text-[13px] font-semibold text-accent-strong">{i + 1}</span>
                            <span className="min-w-0 flex-1 break-words">{c.title}</span>
                            <span className="shrink-0 font-mono text-[12px] text-navy-soft">
                              {unit === 'page' ? 'pp.' : 'lines'} {c.start}-{c.end}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </details>
                  <div className="flex flex-wrap gap-2 border-t border-dashed border-card-line pt-3">
                    <Button variant="outline" icon="edit_note" onClick={recheck} disabled={!!busyNote}>
                      Re-check chapters
                    </Button>
                    <Button variant="soft" icon="description" to={`/teacher/class/${cls.id}/materials/${book.material.id}`}>
                      Open the file page
                    </Button>
                  </div>
                </Frame>

                <div>
                  <Field id="quiz-chapter" label="Chapter number" error={tried || chapterNumber ? (numberError ?? undefined) : undefined}>
                    <TextInput
                      id="quiz-chapter"
                      inputMode="numeric"
                      autoComplete="off"
                      value={chapterNumber}
                      onChange={(e) => setChapterNumber(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      placeholder={`1 to ${total}`}
                      error={tried || chapterNumber ? (numberError ?? undefined) : undefined}
                      className="max-w-[9rem]"
                    />
                  </Field>
                  {picked && (
                    <p className="mt-2 flex flex-wrap items-baseline gap-x-2 rounded-xl bg-[#F3F7FC] px-4 py-2.5 font-inter text-[15px] leading-6 text-navy">
                      <Icon name="menu_book" className="translate-y-[3px] text-[18px] text-select" />
                      <span className="font-semibold">{picked.title}</span>
                      <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-navy-soft">
                        {unit === 'page' ? 'Pages' : 'Lines'} {picked.start} to {picked.end}
                      </span>
                    </p>
                  )}
                </div>

                <Field id="quiz-focus" label="What should the quiz cover?" hint="Optional. For example: collisions and recoil, with a couple of number questions. Leave it empty for the whole chapter. Don’t include student names.">
                  <textarea
                    id="quiz-focus"
                    aria-describedby="quiz-focus-hint"
                    rows={3}
                    maxLength={MAX_FOCUS}
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                    placeholder="Describe what you want to check"
                    className={`${inputClass} resize-y py-3 leading-6`}
                  />
                </Field>

                <QuizSettingsFields value={settings} onChange={setSettings} />
              </>
            )}

            {book && <div className="-mt-2 flex flex-wrap items-center gap-3">{uploadLabel}</div>}
            {fresh && !reading && stage === 'start' && (
              <button type="button" onClick={() => openFresh(fresh)} className="-mt-3 min-h-11 w-fit cursor-pointer px-1 font-inter text-[15px] font-semibold text-accent-strong underline-offset-4 hover:underline">
                Finish checking {fresh.file.name}
              </button>
            )}
            <p role="status" className="-mt-3 font-inter text-[14px] text-navy empty:hidden">
              {reading ? (reading.total ? `Reading page ${reading.done} of ${reading.total}…` : 'Opening the PDF…') : (busyNote ?? fileNote)}
            </p>

            {genError && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#FBE1D8] px-4 py-3 font-inter text-[15px] leading-6 text-[#9C3412]">
                <Icon name="error" className="mt-0.5 text-[20px]" />
                {genError}
              </p>
            )}
            {book && (
              <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-card-line pt-5">
                <Button variant="orange" size="lg" icon={generating ? undefined : 'auto_awesome'} onClick={generate} disabled={generating || (tried && !picked)}>
                  {generating ? 'Reading the chapter and writing…' : 'Make questions'}
                </Button>
                {generating && <p className="font-inter text-[14px] text-navy-soft">A long chapter can take up to a minute.</p>}
              </div>
            )}
          </div>
        </ShowcasePanel>
      )}

      {/* Step 1b: check the chapters of an uploaded book */}
      {stage === 'chapters' && editing && (
        <ChapterEditor
          key={editing.materialId ?? editing.doc.fileName}
          doc={editing.doc}
          method={editing.method}
          initial={editing.initial}
          rightsConfirmed={editing.materialId !== null}
          details={editing.materialId ? undefined : { title: editing.title, attribution: '' }}
          saving={saving}
          onSave={saveChapters}
          onCancel={() => {
            setEditing(null)
            setStage('start')
          }}
          headingRef={stageHeading}
        />
      )}

      {/* Step 2: check, approve, edit, swap, delete, add */}
      {stage === 'questions' && (
        <div className="step-in mt-8">
          <div className="flex flex-col gap-3 rounded-3xl bg-white/90 p-5 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:p-6">
            <div className="min-w-0">
              {heading('Check and approve every question')}
              <p className="mt-1 flex items-center gap-2 font-inter text-[15px] text-navy">
                <Icon name="lock" className="text-[18px] text-accent-strong" />
                Draft. Only questions you approve get published.
              </p>
              <DraftStatusLine status={draftStatus} />
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-navy-soft">
                {chapter ? `${chapter.title} · ` : ''}
                {approved.length} of {drafts.length} approved
              </p>
              {approved.length < drafts.length && (
                <Button variant="soft" icon="done_all" onClick={approveAll} disabled={editingAny}>
                  Approve all
                </Button>
              )}
            </div>
          </div>
          {credit}

          {drafts.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-white/90 p-5 font-inter text-[16px] leading-7 text-navy">No questions left. Add your own, or go back and make a new set.</p>
          ) : (
            <ol className="mt-6 flex flex-col gap-6">
              {drafts.map((d, i) => (
                <li key={d.uid}>
                  <QuestionFrame
                    key={`${d.uid}-${d.editing}-${d.text}`}
                    number={i + 1}
                    draft={d}
                    chapter
                    onEdit={() => setDrafts((ds) => ds.map((x) => (x.uid === d.uid ? { ...x, editing: true } : x)))}
                    onSave={(patch) => saveQuestion(d.uid, patch)}
                    onCancel={() => (d.custom ? setDrafts((ds) => ds.filter((x) => x.uid !== d.uid)) : setDrafts((ds) => ds.map((x) => (x.uid === d.uid ? { ...x, editing: false } : x))))}
                    onRegenerate={() => regenerate(d.uid)}
                    busy={swapping === d.uid}
                    onDelete={() => remove(d.uid)}
                    onToggleApprove={() => update(d.uid, { approved: !d.approved })}
                  />
                </li>
              ))}
            </ol>
          )}

          <div className="mt-6 flex flex-col gap-4 rounded-3xl bg-white/90 p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between md:p-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" icon="add" onClick={addOwn}>
                Add your own question
              </Button>
              <Button variant="outline" icon="arrow_back" onClick={() => setStage('start')}>
                Back to the start
              </Button>
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <Button variant="navy" icon="arrow_forward" onClick={() => setStage('publish')} disabled={editingAny || approved.length === 0}>
                Next: review and publish
              </Button>
              {editingAny ? (
                <p className="font-inter text-[14px] text-navy-soft">Save or cancel the question you’re editing first.</p>
              ) : (
                approved.length === 0 && <p className="font-inter text-[14px] text-navy-soft">Approve at least one question first.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: name, due date, preview, confirm */}
      {stage === 'publish' && (
        <ShowcasePanel
          as="h2"
          number={3}
          title="Review and"
          highlight="publish"
          className="step-in mt-8"
          text={
            <div className="flex flex-col gap-5">
              {heading(`${plural(approved.length, 'approved question')} for ${cls.name}`)}
              {approved.length < drafts.length && <p className="font-inter text-[15px] text-navy-soft">{drafts.length - approved.length} you didn’t approve stay out of the quiz.</p>}
              <Field id="quiz-title" label="Quiz name">
                <input
                  id="quiz-title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    latest.current = { ...latest.current, title: e.target.value }
                  }}
                  className={inputClass}
                />
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
                I’ve read every question, and the right answers are marked correctly.
              </label>
              <div className="flex flex-wrap gap-3">
                <Button variant="orange" size="lg" icon={publishing ? undefined : 'send'} onClick={publish} disabled={!checked || !title.trim() || publishing || approved.length === 0}>
                  {publishing ? 'Publishing…' : 'Publish'}
                </Button>
                <Button variant="outline" size="lg" icon="arrow_back" onClick={() => setStage('questions')}>
                  Back to questions
                </Button>
              </div>
              {credit}
            </div>
          }
        >
          <BrowserWindow url="compass.app/student/quiz">
            <div className="rounded-xl border border-card-line bg-white p-4">
              <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-navy-soft">What students see · Due {dueLabel}</p>
              <p className="mt-2 break-words font-grotesk text-[20px] font-extrabold leading-6 tracking-[-0.01em]">{title || 'Untitled quiz'}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#EEF4FB]" aria-hidden="true">
                <div className="h-full rounded-full bg-accent-strong" style={{ width: `${100 / Math.max(approved.length, 1)}%` }} />
              </div>
              <p className="mt-1.5 font-inter text-[13px] text-navy-soft">Question 1 of {approved.length}</p>
              {preview && (
                <div className="mt-3 rounded-lg bg-[#F6F9FD] p-3">
                  <p className="font-inter text-[15px] font-semibold leading-6">{preview.text}</p>
                  {preview.type === 'numeric' ? (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="block h-10 w-32 rounded-md border border-card-line bg-white" />
                      {preview.unit && <span className="font-inter text-[14px] font-semibold">{preview.unit}</span>}
                    </div>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {preview.options.map((o, i) => (
                        <li key={i} className="flex items-center gap-2 rounded-md border border-card-line bg-white px-2.5 py-2 font-inter text-[14px]">
                          <Icon name="radio_button_unchecked" className="text-[16px] text-navy-soft" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </BrowserWindow>
        </ShowcasePanel>
      )}

      {stage === 'done' && (
        <div ref={doneRef} tabIndex={-1} className="step-in mt-10 grid gap-6 outline-none lg:grid-cols-[1.4fr_1fr]">
          <StatementCard as="h2" title={`${title.trim()} is live for`} highlight={`${cls.name}.`} footer={[plural(publishedCount, 'question'), `Due ${dueLabel}`]}>
            <p>Students can take it from their Quizzes page now. Once they finish, you’ll see the report under Reports.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="navy" icon="add" onClick={restart}>
                Make another quiz
              </Button>
              <Button variant="outline" to="/teacher/reports">
                Go to reports
              </Button>
            </div>
          </StatementCard>
        </div>
      )}
    </>
  )
}

/** "Based on … CC BY-SA 3.0": the credit line of the book the chapter came from. */
function Credit({ text }: { text: string }) {
  return (
    <p className="mt-4 flex w-fit max-w-full items-start gap-2 rounded-2xl bg-white/90 px-4 py-3 font-inter text-[14px] leading-6 text-navy-soft backdrop-blur-sm">
      <Icon name="menu_book" className="mt-0.5 text-[18px] text-select" />
      {text}
    </p>
  )
}

function DraftStatusLine({ status }: { status: DraftStatus }) {
  if (status.state === 'idle') return null
  if (status.state === 'error') {
    return (
      <p role="alert" className="mt-1 flex items-center gap-1.5 font-inter text-[14px] font-medium text-accent-strong">
        <Icon name="error" className="text-[16px]" />
        {status.message}
      </p>
    )
  }
  return (
    <p role="status" className="mt-1 flex items-center gap-1.5 font-inter text-[14px] text-navy-soft">
      <Icon name={status.state === 'saving' ? 'sync' : 'cloud_done'} className="text-[16px] text-select" />
      {status.state === 'saving' ? 'Saving…' : 'Saved as a draft.'}
    </p>
  )
}

/** Chapter quiz drafts the teacher hasn't published yet. */
function DraftList({ drafts, busy, onOpen, onDelete }: { drafts: DraftSummary[]; busy: boolean; onOpen: (id: string) => void; onDelete: (d: DraftSummary) => void }) {
  const [confirm, setConfirm] = useState<string | null>(null)
  return (
    <Frame label="drafts.frame" bodyClassName="p-4 md:p-5">
      <p className="font-inter text-[15px] font-semibold">Drafts waiting for you</p>
      <ul className="mt-2 flex flex-col divide-y divide-dashed divide-card-line">
        {drafts.map((d) => (
          <li key={d.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="break-words font-inter text-[15px] font-semibold leading-6">{d.title}</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-navy-soft">
                {d.approvedCount} of {d.questionCount} approved
              </p>
            </div>
            {confirm === d.id ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="orange" icon="delete" onClick={() => (setConfirm(null), onDelete(d))}>
                  Delete it
                </Button>
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  Keep it
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="navy" icon="fact_check" onClick={() => onOpen(d.id)} disabled={busy}>
                  Review
                </Button>
                <Button variant="outline" icon="delete" onClick={() => setConfirm(d.id)} disabled={busy}>
                  <span className="sr-only">Delete {d.title}</span>
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Frame>
  )
}
