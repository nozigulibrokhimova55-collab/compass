// Finds chapters in an uploaded file, in this order:
//   PDF:  1. top-level bookmarks  2. large headings like "Chapter 3" or "3 Conservation of Energy"
//   .md:  top-level "# " headings
//   .txt: "Chapter N" / "Unit N" lines
// Nothing found means an empty list: the teacher adds chapters by hand.

import { noiseFilter } from './cleanText.ts'
import type { Chapter, Detection, SourceDoc, SourceLine, SourcePage } from './types.ts'

let nextId = 1
export const newChapterId = () => `ch-${nextId++}`

/** "Chapter 3", "Unit 2: Waves", "Part IV". */
const NAMED = /^(chapter|unit|part|module|lesson|topic)\s+(\d{1,3}|[ivxlc]{1,6})\b[\s.:)-]*(.*)$/i
/** "3 Conservation of Energy" (a number, then a capitalised title, no page number at the end). */
const NUMBERED = /^(\d{1,2})\.?\s+([A-Z][^]{2,90})$/
/** Back matter that ends the last chapter. */
const BACK_MATTER = /^(index|glossary|appendix|appendices|answers?\b|answer key|hints and solutions|solutions|photo credits|credits|bibliography|references|acknowledg|about the author|further reading)/i
/** Table of contents line: dot leaders, or text then a page number. */
const TOC_LINE = /(\.\s*){3,}\s*\d{1,4}\s*$|\D\s\d{1,4}$/
const TOC_TITLE = /^(table of contents|contents|brief contents)$/i

const ROMAN: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100 }
function toNumber(s: string): number {
  if (/^\d+$/.test(s)) return Number(s)
  let total = 0
  const r = s.toLowerCase()
  for (let i = 0; i < r.length; i++) {
    const v = ROMAN[r[i]] ?? 0
    total += v < (ROMAN[r[i + 1]] ?? 0) ? -v : v
  }
  return total
}

/** The most common text size, weighted by characters: the body text. */
export function bodySize(pages: SourcePage[]): number {
  const weight = new Map<number, number>()
  for (const p of pages) for (const l of p.lines) weight.set(Math.round(l.size), (weight.get(Math.round(l.size)) ?? 0) + l.text.length)
  let best = 0
  let bestWeight = -1
  for (const [size, w] of weight) if (w > bestWeight) [best, bestWeight] = [size, w]
  return best || 10
}

/** Pages that look like a table of contents: a "Contents" title, or lots of lines ending in page numbers. */
export function tocPages(pages: SourcePage[], body: number): Set<number> {
  const out = new Set<number>()
  for (const p of pages) {
    const titled = p.lines.some((l) => l.size >= body * 1.3 && TOC_TITLE.test(l.text.trim()))
    const listed = p.lines.filter((l) => TOC_LINE.test(l.text.trim())).length
    if (titled || (listed >= 5 && listed >= p.lines.length * 0.3)) out.add(p.number)
  }
  return out
}

/** Chapters from sorted starts: each ends the page before the next one starts. */
function fromStarts(starts: { title: string; start: number }[], lastEnd: number): Chapter[] {
  return starts.map((s, i) => ({
    id: newChapterId(),
    title: s.title,
    start: s.start,
    end: Math.max(s.start, i + 1 < starts.length ? starts[i + 1].start - 1 : lastEnd),
  }))
}

function fromOutline(doc: SourceDoc): Chapter[] {
  const seen = new Set<number>()
  const starts = doc.outline
    .filter((o) => o.page >= 1 && o.page <= doc.pages.length && o.title.trim())
    .sort((a, b) => a.page - b.page)
    .filter((o) => !seen.has(o.page) && seen.add(o.page))
    .map((o) => ({ title: o.title.trim(), start: o.page }))
  return fromStarts(starts, doc.pages.length)
}

type Candidate = { page: number; kind: string; number: number; title: string }

function headingCandidates(doc: SourceDoc, body: number): Candidate[] {
  const skip = tocPages(doc.pages, body)
  const keep = noiseFilter(doc)
  const found: Candidate[] = []
  for (const p of doc.pages) {
    if (skip.has(p.number)) continue
    const lines = p.lines.filter(keep).sort((a, b) => a.y - b.y)
    const firstThree = new Set(lines.filter((l) => l.text.trim().length >= 3).slice(0, 3))
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      const text = l.text.trim()
      // Near the top: the upper 70% of the page (a full-page photo can push the heading down), or the first lines.
      if (l.y > 0.7 && !firstThree.has(l)) continue
      const big = l.size >= body * 1.3
      const named = NAMED.exec(text)
      if (named && (big || (firstThree.has(l) && l.size >= body * 1.1))) {
        const rest = named[3].trim() || titleBelow(lines, i, l.size, body)
        const label = `${named[1][0].toUpperCase()}${named[1].slice(1).toLowerCase()} ${named[2]}`
        found.push({ page: p.number, kind: named[1].toLowerCase(), number: toNumber(named[2]), title: rest ? `${label}: ${rest}` : label })
        break
      }
      const numbered = NUMBERED.exec(text)
      if (numbered && big && !TOC_LINE.test(text)) {
        found.push({ page: p.number, kind: '#', number: Number(numbered[1]), title: `${numbered[1]} ${numbered[2].trim()}` })
        break
      }
    }
  }
  return found
}

/** Big lines right under a "Chapter 3" heading are its title ("Conservation of Angular" + "Momentum"). */
function titleBelow(lines: SourceLine[], at: number, headingSize: number, body: number): string {
  const parts: string[] = []
  for (let j = at + 1; j < lines.length && parts.length < 3; j++) {
    const l = lines[j]
    if (l.size < body * 1.3 || l.size < headingSize * 0.75 || NAMED.test(l.text.trim())) break
    parts.push(l.text.trim())
  }
  return parts.join(' ').replace(/\s+/g, ' ').slice(0, 120)
}

/** Picks one family of headings ("chapter" beats "unit" beats bare numbers) with numbers going up. */
function pickHeadings(found: Candidate[]): Candidate[] {
  const byKind = new Map<string, Candidate[]>()
  for (const c of found) byKind.set(c.kind, [...(byKind.get(c.kind) ?? []), c])
  const named = [...byKind.entries()].filter(([k, list]) => k !== '#' && list.length >= 2)
  let list: Candidate[] | undefined
  if (named.length) {
    list = (byKind.get('chapter')?.length ?? 0) >= 2 ? byKind.get('chapter') : named.sort((a, b) => b[1].length - a[1].length)[0][1]
  } else if ((byKind.get('#')?.length ?? 0) >= 2) {
    list = byKind.get('#')
  }
  if (!list) return []
  const out: Candidate[] = []
  for (const c of list) if (!out.length || c.number > out[out.length - 1].number) out.push(c)
  return out.length >= 2 ? out : []
}

/** The page before the first big "Index" / "Photo Credits" style heading after the last chapter starts. */
function lastChapterEnd(doc: SourceDoc, after: number, body: number): number {
  for (const p of doc.pages.slice(after)) {
    const top = p.lines.filter((l) => l.y < 0.4 && l.size >= body * 1.3)
    if (top.some((l) => BACK_MATTER.test(l.text.trim()))) return p.number - 1
  }
  return doc.pages.length
}

function fromHeadings(doc: SourceDoc): Chapter[] {
  const body = bodySize(doc.pages)
  const picked = pickHeadings(headingCandidates(doc, body))
  if (!picked.length) return []
  const last = picked[picked.length - 1].page
  return fromStarts(
    picked.map((c) => ({ title: c.title, start: c.page })),
    lastChapterEnd(doc, last, body),
  )
}

function fromLines(doc: SourceDoc, match: (line: string) => string | null): Chapter[] {
  const starts: { title: string; start: number }[] = []
  let fenced = false
  for (const p of doc.pages) {
    const text = p.lines[0]?.text ?? ''
    if (/^\s*(```|~~~)/.test(text)) fenced = !fenced
    if (fenced) continue
    const title = match(text)
    if (title) starts.push({ title, start: p.number })
  }
  return fromStarts(starts, doc.pages.length)
}

export function detectChapters(doc: SourceDoc): Detection {
  if (doc.kind === 'md') {
    const chapters = fromLines(doc, (l) => /^#\s+(.+?)\s*#*\s*$/.exec(l)?.[1] ?? null)
    return { method: chapters.length ? 'markdown' : 'none', chapters }
  }
  if (doc.kind === 'txt') {
    const chapters = fromLines(doc, (l) => (NAMED.test(l.trim()) && l.trim().length <= 100 ? l.trim() : null))
    return { method: chapters.length ? 'text' : 'none', chapters }
  }
  const outline = fromOutline(doc)
  if (outline.length) return { method: 'outline', chapters: outline }
  const headings = fromHeadings(doc)
  if (headings.length) return { method: 'headings', chapters: headings }
  return { method: 'none', chapters: [] }
}
