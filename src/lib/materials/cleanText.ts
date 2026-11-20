// Cleans page text: drops running headers, footers and page numbers, joins hyphenated words,
// and collapses extra whitespace.

import { stripControl } from './extract.ts'
import type { SourceDoc, SourceLine, SourcePage } from './types.ts'

/** Headers and footers live in the top and bottom tenth of the page. */
const inMargin = (l: SourceLine) => l.y < 0.1 || l.y > 0.9
/** "17", "Page 17", "Page 17 of 185". */
const PAGE_NUMBER = /^(page\s+)?\d{1,4}(\s+of\s+\d{1,4})?$/i

/** Same line with any page number swapped out, so "17 Chapter 1 Energy" matches "18 Chapter 1 Energy". */
export const lineKey = (text: string) => text.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim()

/**
 * Keys of margin lines that show up on more than half of the given pages that have text.
 * Books often alternate running heads (chapter name on even pages, section on odd), so odd and
 * even pages are also counted on their own. With `atLeast`, a margin line on that many pages also
 * counts (inside one chapter, "Section 2.3 Momentum" repeats on a few pages, never half of them).
 */
export function repeatedLines(pages: SourcePage[], atLeast = Infinity): Set<string> {
  const out = new Set<string>()
  const withText = pages.filter((p) => p.lines.length > 0)
  const groups = [withText, withText.filter((p) => p.number % 2 === 0), withText.filter((p) => p.number % 2 === 1)]
  for (const group of groups) {
    if (group.length < 3) continue
    const counts = new Map<string, number>()
    for (const p of group) {
      const seen = new Set<string>()
      for (const l of p.lines) if (inMargin(l)) seen.add(lineKey(l.text))
      for (const k of seen) counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    for (const [k, n] of counts) if (n > group.length / 2 || n >= atLeast) out.add(k)
  }
  return out
}

/** Joins "arith-" + "metic" across a line break, then tidies spaces and blank lines. */
export function tidy(text: string): string {
  return stripControl(text)
    .replace(/([A-Za-z])-\n\s*([a-z])/g, '$1$2')
    .replace(/[ \t\u00a0]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const wholeFile = new WeakMap<SourceDoc, Set<string>>()

/** For a PDF: a filter that removes page numbers and repeated margin lines, judged across the whole file and across one chapter. */
export function noiseFilter(doc: SourceDoc, start = 1, end = doc.pages.length) {
  if (doc.kind !== 'pdf') return () => true
  let all = wholeFile.get(doc)
  if (!all) wholeFile.set(doc, (all = repeatedLines(doc.pages)))
  const local = start === 1 && end === doc.pages.length ? all : repeatedLines(doc.pages.slice(start - 1, end), 3)
  return (l: SourceLine) => {
    if (!inMargin(l)) return true
    if (PAGE_NUMBER.test(l.text.trim())) return false
    const k = lineKey(l.text)
    return !all.has(k) && !local.has(k)
  }
}

/** Clean text for each page (or line) in the range, keeping the page number. */
export function cleanPages(doc: SourceDoc, start: number, end: number): { page: number; text: string }[] {
  const keep = noiseFilter(doc, start, end)
  return doc.pages.slice(start - 1, end).map((p) => ({
    page: p.number,
    text: tidy(
      p.lines
        .filter(keep)
        .map((l) => l.text)
        .join('\n'),
    ),
  }))
}

/**
 * Clean text for every page of the file, for saving. Pages inside a chapter are cleaned with that chapter's
 * running heads in mind; pages outside any chapter with the whole file's.
 */
export function pagesForSaving(doc: SourceDoc, chapters: { start: number; end: number }[]): string[] {
  const out = cleanPages(doc, 1, doc.pages.length).map((p) => p.text)
  for (const c of chapters) for (const p of cleanPages(doc, c.start, c.end)) out[p.page - 1] = p.text
  return out
}

/** All the clean text of a range as one string. */
export function rangeText(doc: SourceDoc, start: number, end: number): string {
  const parts = cleanPages(doc, start, end).map((p) => p.text)
  return tidy(parts.join(doc.unit === 'page' ? '\n\n' : '\n'))
}

/**
 * A line from the start of a page, for the "is this the right page?" check: the first big heading in the
 * upper part of the page when there is one (so a photo caption above "Chapter 3" doesn't hide it),
 * otherwise the first line.
 */
export function topLine(doc: SourceDoc, pageNumber: number, body = 0): string {
  const page = doc.pages[pageNumber - 1]
  if (!page) return ''
  const keep = noiseFilter(doc)
  const lines = page.lines.filter((l) => keep(l) && l.text.trim().length >= 3).sort((a, b) => a.y - b.y)
  const heading = body > 0 ? lines.find((l) => l.y <= 0.7 && l.size >= body * 1.3) : undefined
  const line = heading ?? lines[0]
  return line ? line.text.trim().slice(0, 140) : ''
}
