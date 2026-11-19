// Turns pdf.js text items into lines, and text files into one "page" per line.
// No pdf.js import here, so the same code runs in the browser and in Node scripts.

import type { SourceDoc, SourceLine, SourcePage } from './types.ts'

/** The parts of a pdf.js TextItem this file uses. */
export type TextItemLike = { str: string; transform: number[]; width: number; height: number; hasEOL?: boolean }

const itemSize = (it: TextItemLike) => it.height || Math.hypot(it.transform[2] ?? 0, it.transform[3] ?? 0)

/**
 * Groups text items into lines in reading order. A line ends at an end-of-line mark, when the
 * baseline moves, or when the text jumps backwards or far right (a second column at the same height).
 */
export function linesFromItems(items: TextItemLike[], pageHeight: number): SourceLine[] {
  const lines: SourceLine[] = []
  let text = ''
  let size = 0
  let baseline: number | null = null
  let lastEnd = 0

  const flush = () => {
    const t = text.replace(/\s+/g, ' ').trim()
    if (t && baseline !== null) lines.push({ text: t, size: Math.round(size * 10) / 10, y: Math.min(1, Math.max(0, 1 - baseline / pageHeight)) })
    text = ''
    size = 0
    baseline = null
  }

  for (const it of items) {
    const x = it.transform[4] ?? 0
    const y = it.transform[5] ?? 0
    const h = itemSize(it)
    const blank = !it.str.trim()
    if (!blank && baseline !== null) {
      const tol = Math.max(2, 0.5 * Math.max(h, size))
      const moved = Math.abs(y - baseline) > tol
      const jumped = x < lastEnd - 2 * Math.max(h, 1) || x > lastEnd + 3 * Math.max(h, size, 1)
      if (moved || jumped) flush()
      else if (x > lastEnd + 0.2 * h && !/\s$/.test(text)) text += ' '
    }
    if (!blank) {
      if (baseline === null) baseline = y
      size = Math.max(size, h)
      lastEnd = x + it.width
    }
    text += it.str
    if (it.hasEOL) flush()
  }
  flush()
  return lines
}

/** A .md or .txt file as one "page" per line, so chapter ranges are line ranges. */
export function docFromText(fileName: string, kind: 'md' | 'txt', text: string): SourceDoc {
  const pages: SourcePage[] = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line, i) => ({ number: i + 1, lines: [{ text: line, size: 0, y: 0 }] }))
  return { kind, fileName, unit: 'line', pages, outline: [] }
}

/**
 * A saved file rebuilt from its stored page text, for "Re-check chapters". Font sizes and positions
 * aren't stored, so the page preview shows each page's first line.
 */
export function docFromSavedPages(fileName: string, kind: SourceDoc['kind'], pages: string[]): SourceDoc {
  return {
    kind,
    fileName,
    unit: kind === 'pdf' ? 'page' : 'line',
    pages: pages.map((text, i) => ({
      number: i + 1,
      lines: text
        .split('\n')
        .filter((t) => t.trim())
        .map((t) => ({ text: t, size: 0, y: 0.5 })),
    })),
    outline: [],
  }
}

/** Average characters per page. Under 100 means the PDF is probably scanned images. */
export function charsPerPage(doc: SourceDoc): number {
  if (!doc.pages.length) return 0
  const total = doc.pages.reduce((sum, p) => sum + p.lines.reduce((s, l) => s + l.text.length, 0), 0)
  return total / doc.pages.length
}
