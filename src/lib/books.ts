// Textbooks a class can use as course material. Each book is a folder in src/data/books/<id>/ with a
// syllabus.json, and its chapter PDFs live in the Supabase Storage bucket "course-materials" under <id>/.
// To add a book: drop its syllabus.json in a new folder, add one entry to BOOKS below, and upload its PDFs
// with `npm run seed:materials`.

import conceptualPhysics from '../data/books/conceptual-physics/syllabus.json'

export type SectionType = 'lesson' | 'problems'

export type BookSection = {
  id: string
  title: string
  type: SectionType
  start_page: number
  end_page: number
  suggested_classes: number
}

export type BookChapter = {
  number: number
  title: string
  start_page: number
  end_page: number
  file: string
  suggested_classes: number
  sections: BookSection[]
}

export type Syllabus = {
  title: string
  author: string
  license: string
  source: string
  attribution: string
  core_chapters: number[]
  chapters: BookChapter[]
}

export type Book = {
  id: string
  syllabus: Syllabus
  /**
   * Pages at the front of each chapter PDF before the chapter's first printed page (for this book: a blank page and
   * the license page). Book page p of a chapter is page `p - chapter.start_page + 1 + leadingPages` of its file.
   */
  leadingPages: number
}

export const STORAGE_BUCKET = 'course-materials'

const BOOKS: Record<string, Book> = {
  'conceptual-physics': { id: 'conceptual-physics', syllabus: conceptualPhysics as Syllabus, leadingPages: 2 },
}

export function getBook(id: string | null | undefined): Book | null {
  return (id && BOOKS[id]) || null
}

export function allBooks(): Book[] {
  return Object.values(BOOKS)
}

export function chapterOf(book: Book, number: number) {
  return book.syllabus.chapters.find((c) => c.number === number) ?? null
}

/** The chapter a section belongs to, e.g. "2.3" belongs to chapter 2. */
export function sectionOf(book: Book, sectionId: string) {
  for (const chapter of book.syllabus.chapters) {
    const section = chapter.sections.find((s) => s.id === sectionId)
    if (section) return { chapter, section }
  }
  return null
}

/** Where a chapter's PDF lives in the storage bucket. */
export function chapterPath(book: Book, chapter: BookChapter) {
  return `${book.id}/${chapter.file}`
}

/** The page inside the chapter's PDF file where a printed book page starts. */
export function filePage(book: Book, chapter: BookChapter, bookPage: number) {
  return bookPage - chapter.start_page + 1 + book.leadingPages
}

/** "pp. 40–52" or "p. 39". */
export function pagesLabel(start: number, end: number) {
  return start === end ? `p. ${start}` : `pp. ${start}–${end}`
}
