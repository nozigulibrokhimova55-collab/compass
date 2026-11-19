// Shared shapes for reading an uploaded book or notes file and splitting it into chapters.
// Everything in src/lib/materials is plain TypeScript with no React or browser APIs, except readPdf.ts.

/** One line of text as it sits on the page. */
export type SourceLine = {
  text: string
  /** Font size (text height) in PDF points. 0 for plain text files. */
  size: number
  /** Distance from the top of the page, 0 (top) to 1 (bottom). */
  y: number
}

/** One PDF page, or one line of a .md / .txt file. */
export type SourcePage = {
  /** 1-based PDF page number (or line number for text files). */
  number: number
  lines: SourceLine[]
}

export type SourceKind = 'pdf' | 'md' | 'txt'

export type SourceDoc = {
  kind: SourceKind
  fileName: string
  /** What the chapter ranges count: PDF pages, or lines of a text file. */
  unit: 'page' | 'line'
  pages: SourcePage[]
  /** Top-level PDF bookmarks that point at a page. */
  outline: { title: string; page: number }[]
}

export type Chapter = {
  id: string
  title: string
  /** First and last page (or line), inclusive. */
  start: number
  end: number
}

export type DetectMethod = 'outline' | 'headings' | 'markdown' | 'text' | 'none'

export type Detection = { method: DetectMethod; chapters: Chapter[] }
