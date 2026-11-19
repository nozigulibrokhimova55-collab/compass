// Turns an uploaded file's saved chapters into a Book, so the syllabus calendar (planner, calendar views,
// PDF links) works for it unchanged. Pure: no database.

import { uploadBookId, type Book, type BookChapter } from '../books.ts'

/** Pages per class when suggesting how many classes a chapter needs. */
export const PAGES_PER_CLASS = 6

export type MaterialLike = { id: string; title: string; filePath: string; fileType: 'pdf' | 'md' | 'txt'; attribution: string | null }
export type ChapterLike = { title: string; start: number; end: number }

/** Lesson classes a chapter of this many pages needs: one per 6 pages, at least one. */
export const lessonClasses = (pages: number) => Math.max(1, Math.ceil(pages / PAGES_PER_CLASS))

/**
 * Chapter n (1-based, in page order) has one section "n.1" covering all its pages, with ceil(pages / 6)
 * classes; the chapter adds one class for its quiz, the same shape as a syllabus.json.
 */
export function materialBook(m: MaterialLike, chapters: ChapterLike[]): Book {
  const sorted = [...chapters].sort((a, b) => a.start - b.start)
  const bookChapters: BookChapter[] = sorted.map((c, i) => {
    const lessons = lessonClasses(c.end - c.start + 1)
    return {
      number: i + 1,
      title: c.title,
      start_page: c.start,
      end_page: c.end,
      file: m.filePath,
      suggested_classes: lessons + 1,
      sections: [{ id: `${i + 1}.1`, title: c.title, type: 'lesson', start_page: c.start, end_page: c.end, suggested_classes: lessons }],
    }
  })
  return {
    id: uploadBookId(m.id),
    leadingPages: 0,
    // Only PDFs open at a page; .md and .txt "pages" are lines, so there is nothing to link to.
    wholeFile: m.fileType === 'pdf' ? m.filePath : undefined,
    syllabus: {
      title: m.title,
      author: '',
      license: '',
      source: '',
      attribution: m.attribution ?? '',
      core_chapters: bookChapters.map((c) => c.number),
      chapters: bookChapters,
    },
  }
}
