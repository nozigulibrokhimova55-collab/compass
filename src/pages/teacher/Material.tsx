import { useCallback, useEffect, useRef, useState } from 'react'
import { QuizSettingsFields } from '../../components/materials/QuizSettingsFields'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BlockTitle, Loading } from '../../components/area/AreaBits'
import { courseGate, useTeacherClass } from '../../components/course/courseGate'
import { Icon } from '../../components/Icon'
import { ChapterEditor } from '../../components/materials/ChapterEditor'
import { BackLink } from '../../components/student/QuizRunner'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Field, TextInput } from '../../components/ui/Field'
import { Frame } from '../../components/ui/Frame'
import { PageNotice } from '../../components/ui/PageNotice'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { uploadBookId } from '../../lib/books'
import { ChapterQuizzesNotSetUpError, DEFAULT_SETTINGS, fetchDrafts, generateChapterQuestions, saveQuizDraft, type DraftSummary, type QuizSettings } from '../../lib/chapterQuizDb'
import { addCourseBook } from '../../lib/courseDb'
import { errorMessage } from '../../lib/db'
import { lessonClasses } from '../../lib/materials/asBook'
import { docFromSavedPages } from '../../lib/materials/extract'
import type { Chapter, SourceDoc } from '../../lib/materials/types'
import {
  deleteMaterial,
  fetchMaterial,
  fetchPageTexts,
  fileTypeLabel,
  MATERIALS_MIGRATION,
  MaterialsNotSetUpError,
  materialFileLink,
  registerMaterialBook,
  renameMaterial,
  saveMaterialChapters,
  unitOf,
  type Material,
  type MaterialChapter,
} from '../../lib/materialsDb'
import { useCourse } from '../../lib/useCourse'

type Loaded = { material: Material; chapters: MaterialChapter[] }
type State = { status: 'loading' } | { status: 'missing' } | { status: 'not-set-up' } | { status: 'error'; message: string } | { status: 'ok'; data: Loaded }

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** One uploaded file: its chapters, "Re-check chapters", "Add chapters to the calendar", and delete. */
export default function TeacherMaterial() {
  const t = useTeacherClass()
  const { materialId } = useParams()
  const course = useCourse(t.cls?.id)
  const [state, setState] = useState<State>({ status: 'loading' })

  const load = useCallback(async (id: string): Promise<State> => {
    try {
      const found = await fetchMaterial(id)
      if (!found) return { status: 'missing' }
      registerMaterialBook(found.material, found.chapters)
      return { status: 'ok', data: found }
    } catch (err) {
      if (err instanceof MaterialsNotSetUpError) return { status: 'not-set-up' }
      console.error('Could not load the file', err)
      return { status: 'error', message: errorMessage(err, 'We couldn’t load this file.') }
    }
  }, [])

  useEffect(() => {
    if (!materialId) return
    let live = true
    load(materialId).then((s) => live && setState(s))
    return () => {
      live = false
    }
  }, [materialId, load])

  if (!t.ok) return t.screen
  const cls = t.cls
  const back = `/teacher/class/${cls.id}/materials`
  const gate = courseGate(course)

  let body
  if (gate) body = gate
  else if (state.status === 'loading') body = <Loading />
  else if (state.status === 'not-set-up') {
    body = (
      <PageNotice label="setup.frame" title="Saving files isn’t switched on yet">
        Its tables need to be added to the database once. Ask Mauricio (or anyone with access to Supabase) to run <span className="font-mono text-[14px] text-navy">{MATERIALS_MIGRATION}</span> in the SQL Editor, then reload this page.
      </PageNotice>
    )
  } else if (state.status === 'error') {
    body = (
      <PageNotice label="error.frame" title="We couldn’t load this file" alert>
        {state.message}
      </PageNotice>
    )
  } else if (state.status === 'missing' || state.data.material.classId !== cls.id) {
    body = (
      <EmptyState label="file.frame" icon="search_off" title="We can’t find that file" className="mt-10 max-w-xl" action={{ label: 'Back to course materials', to: back, icon: 'arrow_back' }}>
        It may have been deleted, or it belongs to another class.
      </EmptyState>
    )
  } else {
    body = (
      <FileView
        key={state.data.material.id}
        classId={cls.id}
        data={state.data}
        usedByCalendar={course.schedule?.bookId === uploadBookId(state.data.material.id)}
        reload={async () => {
          const next = await load(state.data.material.id)
          setState(next)
          await course.reload()
        }}
      />
    )
  }

  return (
    <>
      <BackLink to={back}>Course materials</BackLink>
      <SectionHeader as="h1" size="sm" align="left" script="your upload" title="Your file" className="mt-6" />
      {body}
    </>
  )
}

function FileView({ classId, data, usedByCalendar, reload }: { classId: string; data: Loaded; usedByCalendar: boolean; reload: () => Promise<void> }) {
  const notify = useToast()
  const navigate = useNavigate()
  const { material: m, chapters } = data
  const unit = unitOf(m.fileType)
  const [editing, setEditing] = useState<SourceDoc | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [drafts, setDrafts] = useState<DraftSummary[]>([])
  const editorHeading = useRef<HTMLHeadingElement>(null)

  // Chapter quiz drafts waiting for review, so each chapter can link to its own.
  const refreshDrafts = useCallback(async () => {
    try {
      const list = await fetchDrafts(classId)
      setDrafts(list.filter((d) => d.materialId === m.id))
    } catch (err) {
      if (!(err instanceof ChapterQuizzesNotSetUpError)) console.error('Could not load drafts', err)
    }
  }, [classId, m.id])
  useEffect(() => {
    let live = true
    fetchDrafts(classId)
      .then((list) => live && setDrafts(list.filter((d) => d.materialId === m.id)))
      .catch((err) => !(err instanceof ChapterQuizzesNotSetUpError) && console.error('Could not load drafts', err))
    return () => {
      live = false
    }
  }, [classId, m.id])

  const run = async (label: string, work: () => Promise<void>, fallback: string) => {
    setBusy(label)
    try {
      await work()
    } catch (err) {
      console.error(fallback, err)
      notify(errorMessage(err, fallback), 'error')
    } finally {
      setBusy(null)
    }
  }

  const openFile = (page?: number) =>
    run('Opening the file…', async () => {
      // Open the tab first (browsers block tabs opened after a wait), then point it at the signed link.
      const tab = window.open('', '_blank')
      try {
        const link = await materialFileLink(m, page)
        if (tab) tab.location.href = link
        else window.location.href = link
      } catch (err) {
        tab?.close()
        throw err
      }
    }, 'We couldn’t open the file. Try again.')

  const recheck = () =>
    run('Opening the chapters…', async () => {
      setEditing(docFromSavedPages(m.title, m.fileType, await fetchPageTexts(m.id)))
      requestAnimationFrame(() => editorHeading.current?.focus())
    }, 'We couldn’t open the chapters. Try again.')

  const saveChapters = async (next: Chapter[]) => {
    setSaving('Saving the chapters…')
    try {
      await saveMaterialChapters(m.id, next)
      await reload()
      setEditing(null)
      notify(usedByCalendar ? 'Chapters saved. Rebuild the calendar on the Schedule page so it matches.' : 'Chapters saved.')
    } catch (err) {
      console.error('Could not save the chapters', err)
      notify(errorMessage(err, 'We couldn’t save the chapters. Try again.'), 'error')
    } finally {
      setSaving(null)
    }
  }

  const addToCalendar = () =>
    run('Adding…', async () => {
      const bookId = uploadBookId(m.id)
      await addCourseBook(classId, bookId)
      registerMaterialBook(m, chapters)
      navigate(`/teacher/class/${classId}/schedule?book=${bookId}`)
    }, 'We couldn’t add the chapters to the calendar. Try again.')

  const remove = () =>
    run('Deleting…', async () => {
      await deleteMaterial(m.id)
      notify(`Deleted ${m.title}.`, 'delete')
      navigate(`/teacher/class/${classId}/materials`)
    }, 'We couldn’t delete the file. Try again.')

  if (editing) {
    return (
      <ChapterEditor
        doc={editing}
        method="headings"
        initial={chapters}
        rightsConfirmed
        saving={saving}
        onSave={saveChapters}
        onCancel={() => setEditing(null)}
        headingRef={editorHeading}
      />
    )
  }

  const disabled = busy !== null

  return (
    <>
      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Frame label="file.frame" bodyClassName="p-6 md:p-8">
          <p className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-navy-soft">
            {fileTypeLabel(m.fileType)} · {plural(m.pageCount, unit)} · {plural(chapters.length, 'chapter')}
          </p>
          {renaming ? (
            <RenameForm material={m} onDone={async (changed) => (changed && (await reload()), setRenaming(false))} />
          ) : (
            <>
              <h2 className="mt-1 break-words font-grotesk text-[30px] font-black leading-tight tracking-[-0.02em]">{m.title}</h2>
              {m.attribution ? (
                <p className="mt-3 flex items-start gap-2 rounded-2xl bg-[#F3F7FC] p-4 font-inter text-[14px] leading-6 text-navy-soft">
                  <Icon name="menu_book" className="mt-0.5 text-[18px] text-select" />
                  {m.attribution}
                </p>
              ) : (
                <p className="mt-2 font-inter text-[15px] text-navy-soft">No credit line yet. Add one if the source asks for it.</p>
              )}
            </>
          )}
          {!renaming && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="orange" icon="calendar_month" onClick={usedByCalendar ? () => navigate(`/teacher/class/${classId}/calendar`) : addToCalendar} disabled={disabled}>
                {usedByCalendar ? 'Open the calendar' : 'Add chapters to the calendar'}
              </Button>
              <Button variant="outline" icon="edit_note" onClick={recheck} disabled={disabled}>
                Re-check chapters
              </Button>
              <Button variant="outline" icon={m.fileType === 'pdf' ? 'picture_as_pdf' : 'description'} onClick={() => openFile()} disabled={disabled}>
                Open the file
              </Button>
              <Button variant="soft" icon="edit" onClick={() => setRenaming(true)} disabled={disabled}>
                Name and credit
              </Button>
            </div>
          )}
          <p role="status" className="mt-3 font-inter text-[14px] text-navy-soft empty:hidden">
            {busy}
          </p>
        </Frame>

        <Frame label="privacy.frame" bodyClassName="p-6">
          <h2 className="font-grotesk text-[20px] font-extrabold tracking-[-0.01em]">Who sees this</h2>
          <p className="mt-2 font-inter text-[15px] leading-6 text-navy-soft">
            Only you can open the file and read its text. If you add it to the calendar, students and families see the chapter names there. They see questions only after you approve and publish a quiz.
          </p>
        </Frame>
      </div>

      <AllChapterQuizzes chapters={chapters} onMade={refreshDrafts} />

      <section aria-labelledby="file-chapters" className="mt-14">
        <BlockTitle id="file-chapters">{`Chapters · ${chapters.length}`}</BlockTitle>
        {usedByCalendar && (
          <p className="mt-4 w-fit max-w-3xl rounded-xl bg-note px-4 py-3 font-inter text-[15px] leading-6">
            Your class calendar uses these chapters. If you change them, rebuild the calendar on the Schedule page so it matches.
          </p>
        )}
        <ol className="mt-6 grid gap-6 lg:grid-cols-2">
          {chapters.map((c, i) => {
            const pages = c.end - c.start + 1
            const lessons = lessonClasses(pages)
            const waiting = drafts.filter((d) => d.chapterId === c.id)
            return (
              <li key={c.id}>
                <Frame label={`ch${String(i + 1).padStart(2, '0')}.frame`} className="h-full" bodyClassName="flex h-full flex-col gap-3 p-5 md:p-6">
                  <h3 className="break-words font-grotesk text-[20px] font-extrabold leading-tight tracking-[-0.01em]">{c.title}</h3>
                  <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-navy-soft">
                    {unit === 'page' ? 'Pages' : 'Lines'} {c.start} to {c.end} · {plural(pages, unit)}
                  </p>
                  {unit === 'page' && (
                    <p className="font-inter text-[15px] text-navy-soft">
                      Calendar suggestion: {plural(lessons, 'class')}, then a quiz day.
                    </p>
                  )}
                  {waiting.length > 0 && (
                    <ul className="flex flex-col gap-1.5">
                      {waiting.map((d) => (
                        <li key={d.id}>
                          <Link to={`/teacher/quizzes?draft=${d.id}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-note px-3 font-inter text-[14px] font-semibold text-navy hover:underline">
                            <Icon name="fact_check" className="text-[18px] text-[#6B3F0E]" />
                            Draft to review · {d.approvedCount} of {d.questionCount} approved
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <Button variant="navy" icon="quiz" to={`/teacher/quizzes?material=${m.id}&chapter=${c.id}`}>
                      Make a quiz
                    </Button>
                    {m.fileType === 'pdf' && (
                      <Button variant="outline" icon="open_in_new" onClick={() => openFile(c.start)} disabled={disabled}>
                        {`Open at page ${c.start}`}
                      </Button>
                    )}
                  </div>
                </Frame>
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby="file-delete" className="mt-14 max-w-xl">
        <BlockTitle id="file-delete">Delete</BlockTitle>
        <div className="mt-6 rounded-3xl border border-card-line bg-white p-5 shadow-card md:p-6">
          {usedByCalendar ? (
            <p className="font-inter text-[15px] leading-6 text-navy-soft">Your class calendar uses this file, so it can’t be deleted. Build the calendar from another book first.</p>
          ) : confirmDelete ? (
            <div role="alert" className="flex flex-col gap-4">
              <p className="font-inter text-[15px] leading-6 text-navy">Delete {m.title}? Its chapters and saved text go too. This can’t be undone.</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="orange" icon="delete" onClick={remove} disabled={disabled}>
                  {busy === 'Deleting…' ? 'Deleting…' : 'Delete the file'}
                </Button>
                <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={disabled}>
                  Keep it
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="font-inter text-[15px] leading-6 text-navy-soft">Removes the file, its text and its chapters from Compass.</p>
              <Button variant="outline" icon="delete" onClick={() => setConfirmDelete(true)} disabled={disabled}>
                Delete this file
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function RenameForm({ material: m, onDone }: { material: Material; onDone: (changed: boolean) => void }) {
  const notify = useToast()
  const [title, setTitle] = useState(m.title)
  const [credit, setCredit] = useState(m.attribution ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) return setError('Give the file a name.')
    setSaving(true)
    try {
      await renameMaterial(m.id, title, credit)
      notify('Saved.')
      onDone(true)
    } catch (err) {
      console.error('Could not rename the file', err)
      notify(errorMessage(err, 'We couldn’t save that. Try again.'), 'error')
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <Field id="rename-title" label="Name of the book or file" error={error || undefined}>
        <TextInput id="rename-title" value={title} maxLength={200} onChange={(e) => (setTitle(e.target.value), setError(''))} error={error || undefined} />
      </Field>
      <Field id="rename-credit" label="Credit line (optional)" hint="Shown on quizzes made from it.">
        <TextInput id="rename-credit" value={credit} maxLength={300} onChange={(e) => setCredit(e.target.value)} hint />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button variant="navy" icon="check" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="outline" onClick={() => onDone(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

type BatchRow = { state: 'waiting' } | { state: 'writing' } | { state: 'ready'; draftId: string; got: number; asked: number } | { state: 'failed'; message: string }

/**
 * "Make quizzes for all chapters": one chapter at a time (so no single call runs into the time limit), each
 * saved as its own draft. A chapter that fails shows "Try again" and the rest carry on.
 */
function AllChapterQuizzes({ chapters, onMade }: { chapters: MaterialChapter[]; onMade: () => Promise<void> }) {
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS)
  const [rows, setRows] = useState<Record<string, BatchRow> | null>(null)
  const [running, setRunning] = useState(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const setRow = (id: string, row: BatchRow) => alive.current && setRows((r) => ({ ...(r ?? {}), [id]: row }))

  const makeOne = async (c: MaterialChapter, s: QuizSettings) => {
    setRow(c.id, { state: 'writing' })
    try {
      const { questions, requested } = await generateChapterQuestions(c.id, s)
      const draftId = await saveQuizDraft({ quizId: null, chapterId: c.id, title: `${c.title} quiz`, questions })
      setRow(c.id, { state: 'ready', draftId, got: questions.length, asked: requested })
    } catch (err) {
      console.error(`Could not make a quiz for ${c.title}`, err)
      setRow(c.id, { state: 'failed', message: errorMessage(err, 'We couldn’t write this one.') })
    }
  }

  const makeAll = async () => {
    const s = settings
    setRunning(true)
    setRows(Object.fromEntries(chapters.map((c) => [c.id, { state: 'waiting' } as BatchRow])))
    for (const c of chapters) {
      if (!alive.current) return
      await makeOne(c, s)
    }
    if (!alive.current) return
    setRunning(false)
    await onMade()
  }

  const retry = async (c: MaterialChapter) => {
    await makeOne(c, settings)
    await onMade()
  }

  const list = rows ? chapters.filter((c) => rows[c.id]) : []
  const done = list.filter((c) => rows?.[c.id]?.state === 'ready' || rows?.[c.id]?.state === 'failed').length

  return (
    <section aria-labelledby="all-quizzes" className="mt-14">
      <BlockTitle id="all-quizzes">Quizzes for every chapter</BlockTitle>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Frame label="settings.frame" bodyClassName="flex flex-col gap-5 p-5 md:p-6">
          <p className="font-inter text-[15px] leading-6 text-navy-soft">
            Makes a draft quiz for each chapter, one after another. Nothing reaches students until you approve and publish each one.
          </p>
          <QuizSettingsFields value={settings} onChange={setSettings} />
          <Button variant="orange" icon={running ? undefined : 'auto_awesome'} onClick={makeAll} disabled={running || chapters.length === 0} className="w-fit">
            {running ? `Writing… ${done} of ${list.length} done` : 'Make quizzes for all chapters'}
          </Button>
        </Frame>
        {rows && (
          <Frame label="progress.frame" bodyClassName="p-5 md:p-6">
            <p role="status" className="font-inter text-[15px] font-semibold">
              {running ? `${done} of ${list.length} done. Keep this page open.` : `${list.filter((c) => rows[c.id]?.state === 'ready').length} of ${list.length} drafts ready.`}
            </p>
            <ol className="mt-3 flex flex-col divide-y divide-dashed divide-card-line">
              {list.map((c) => {
                const row = rows[c.id]
                return (
                  <li key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words font-inter text-[15px] font-semibold leading-6">{c.title}</p>
                      <p className={`font-inter text-[14px] ${row.state === 'failed' ? 'font-medium text-accent-strong' : 'text-navy-soft'}`}>
                        {row.state === 'waiting' && 'Waiting'}
                        {row.state === 'writing' && 'Reading the chapter and writing…'}
                        {row.state === 'ready' && (row.got < row.asked ? `${row.got} of ${row.asked} questions passed our checks.` : `${row.got} questions, waiting for your review.`)}
                        {row.state === 'failed' && row.message}
                      </p>
                    </div>
                    {row.state === 'ready' && (
                      <Button variant="navy" icon="fact_check" to={`/teacher/quizzes?draft=${row.draftId}`}>
                        Review
                      </Button>
                    )}
                    {row.state === 'failed' && (
                      <Button variant="outline" icon="refresh" onClick={() => retry(c)} disabled={running}>
                        Try again
                      </Button>
                    )}
                    {row.state === 'writing' && <Icon name="progress_activity" className="animate-spin text-[22px] text-select motion-reduce:animate-none" />}
                  </li>
                )
              })}
            </ol>
          </Frame>
        )}
      </div>
    </section>
  )
}
