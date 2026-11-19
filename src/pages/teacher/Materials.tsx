import { useEffect, useState } from 'react'
import { BlockTitle } from '../../components/area/AreaBits'
import { BookAttribution } from '../../components/course/CourseBits'
import { courseGate, useTeacherClass } from '../../components/course/courseGate'
import { Icon } from '../../components/Icon'
import { BackLink } from '../../components/student/QuizRunner'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui/Button'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { allBooks, pagesLabel, type Book } from '../../lib/books'
import { addCourseBook, atPage, chapterPdfLinks } from '../../lib/courseDb'
import { errorMessage } from '../../lib/db'
import { useCourse } from '../../lib/useCourse'

export default function TeacherMaterials() {
  const t = useTeacherClass()
  const course = useCourse(t.cls?.id)
  if (!t.ok) return t.screen
  const cls = t.cls
  const gate = courseGate(course)

  return (
    <>
      <BackLink to="/teacher/class">Class</BackLink>
      <SectionHeader as="h1" size="sm" align="left" script="the book" title="Course materials" className="mt-6" />
      {gate ??
        (course.book ? (
          <BookView book={course.book} classId={cls.id} />
        ) : (
          <PickBook classId={cls.id} className={cls.name} unknown={course.unknownBook} onPicked={course.reload} />
        ))}
    </>
  )
}

function PickBook({ classId, className, unknown, onPicked }: { classId: string; className: string; unknown: string | null; onPicked: () => Promise<void> }) {
  const notify = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const pick = async (book: Book) => {
    setBusy(book.id)
    try {
      await addCourseBook(classId, book.id)
      notify(`${book.syllabus.title} is now course material for ${className}.`)
      await onPicked()
    } catch (err) {
      notify(errorMessage(err, 'We couldn’t add that book. Try again.'), 'error')
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="mt-10 max-w-3xl">
      {unknown && (
        <p className="mb-6 rounded-xl bg-note px-4 py-3 font-inter text-[15px] leading-6">
          This class is linked to “{unknown}”, but this copy of Compass doesn’t have that book’s syllabus.json yet.
        </p>
      )}
      <p className="w-fit rounded-xl bg-white/85 px-4 py-2 font-inter text-[16px] backdrop-blur-sm">Pick the textbook {className} follows. The calendar and chapter quizzes are built from it.</p>
      <ul className="mt-6 grid gap-6 md:grid-cols-2">
        {allBooks().map((b) => (
          <li key={b.id}>
            <Frame label={`${b.id}.frame`} className="h-full" bodyClassName="flex h-full flex-col gap-3 p-6">
              <h2 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">{b.syllabus.title}</h2>
              <p className="font-inter text-[15px] text-navy-soft">
                {b.syllabus.author} · {b.syllabus.chapters.length} chapters
              </p>
              <BookAttribution book={b} />
              <Button variant="orange" icon="add" onClick={() => pick(b)} disabled={busy !== null} className="mt-auto w-fit">
                {busy === b.id ? 'Adding…' : 'Use this book'}
              </Button>
            </Frame>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BookView({ book, classId }: { book: Book; classId: string }) {
  const [links, setLinks] = useState<Record<number, string> | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const s = book.syllabus

  useEffect(() => {
    let live = true
    chapterPdfLinks(book)
      .then((l) => live && setLinks(l))
      .catch((err) => {
        console.error('Could not get PDF links', err)
        if (live) setLinkError('The chapter PDFs aren’t available yet. They need to be uploaded with npm run seed:materials.')
      })
    return () => {
      live = false
    }
  }, [book])

  return (
    <>
      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Frame label="book.frame" bodyClassName="p-6 md:p-8">
          <p className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-navy-soft">Textbook</p>
          <h2 className="mt-1 font-grotesk text-[30px] font-black leading-tight tracking-[-0.02em]">{s.title}</h2>
          <p className="mt-1 font-inter text-[17px] text-navy-soft">by {s.author}</p>
          <div className="mt-5 rounded-2xl bg-[#F3F7FC] p-4">
            <BookAttribution book={book} />
            <p className="mt-2 font-inter text-[14px] leading-6 text-navy-soft">License: {s.license}.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button to={`/teacher/class/${classId}/schedule`} variant="orange" icon="calendar_month">
              Set up the schedule
            </Button>
          </div>
        </Frame>
        <Frame label="quizzes.frame" bodyClassName="p-6">
          <h2 className="font-grotesk text-[20px] font-extrabold tracking-[-0.01em]">How quizzes use the book</h2>
          <p className="mt-2 font-inter text-[15px] leading-6 text-navy-soft">
            Quizzes read the text of the pages listed for each section, never the whole book, and never its pictures. Some pictures in the book have their own licenses.
          </p>
        </Frame>
      </div>

      <section aria-labelledby="chapters" className="mt-14">
        <BlockTitle id="chapters">{`Chapters · ${s.chapters.length}`}</BlockTitle>
        {linkError && (
          <p role="status" className="mt-4 max-w-3xl rounded-xl bg-note px-4 py-3 font-inter text-[15px] leading-6">
            {linkError}
          </p>
        )}
        <ol className="mt-6 grid gap-6 lg:grid-cols-2">
          {s.chapters.map((ch) => {
            const link = links?.[ch.number]
            const core = s.core_chapters.includes(ch.number)
            return (
              <li key={ch.number}>
                <Frame label={`ch${String(ch.number).padStart(2, '0')}.frame`} tabEnd={core ? <span className="rounded-full bg-accent-strong px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white">Core</span> : undefined} className="h-full" bodyClassName="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-grotesk text-[20px] font-extrabold leading-tight tracking-[-0.01em]">
                      <span className="mr-1.5 text-accent">{ch.number}.</span>
                      {ch.title}
                    </h3>
                    {link ? (
                      <a href={atPage(link, book, ch, ch.start_page)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border-[1.5px] border-navy px-3 font-inter text-[14px] font-semibold hover:bg-navy hover:text-white">
                        <Icon name="picture_as_pdf" className="text-[18px]" />
                        PDF
                      </a>
                    ) : null}
                  </div>
                  <p className="mt-1 font-mono text-[12px] uppercase tracking-[0.08em] text-navy-soft">
                    {pagesLabel(ch.start_page, ch.end_page)} · {ch.suggested_classes} classes with the quiz
                  </p>
                  <ul className="mt-4 divide-y divide-card-line border-t border-card-line">
                    {ch.sections.map((sec) => (
                      <li key={sec.id} className="flex items-center gap-3 py-2.5 font-inter text-[15px]">
                        <span className="w-9 shrink-0 font-mono text-[13px] font-semibold text-navy-soft">{sec.id}</span>
                        <span className="min-w-0 flex-1">
                          {sec.title}
                          <span className="block text-[13px] text-navy-soft">
                            {sec.type === 'problems' ? 'Problems' : 'Lesson'} · {sec.suggested_classes} {sec.suggested_classes === 1 ? 'class' : 'classes'}
                          </span>
                        </span>
                        {link ? (
                          <a href={atPage(link, book, ch, sec.start_page)} target="_blank" rel="noreferrer" className="shrink-0 font-mono text-[13px] font-semibold text-accent-strong underline-offset-2 hover:underline">
                            {pagesLabel(sec.start_page, sec.end_page)}
                          </a>
                        ) : (
                          <span className="shrink-0 font-mono text-[13px] text-navy-soft">{pagesLabel(sec.start_page, sec.end_page)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Frame>
              </li>
            )
          })}
        </ol>
      </section>
    </>
  )
}
