// Pure edits for the "Check the chapters" list. Every function returns a new list.
// Rows stay in the order the teacher sees them; only add, merge and split re-sort by start page.

import { newChapterId } from './findChapters.ts'
import type { Chapter } from './types.ts'

const byStart = (list: Chapter[]) => [...list].sort((a, b) => a.start - b.start || a.end - b.end)

export function rename(list: Chapter[], id: string, title: string): Chapter[] {
  return list.map((c) => (c.id === id ? { ...c, title } : c))
}

/** Sets a start or end page. NaN (an empty box) is kept so the teacher can type, and validate() flags it. */
export function setRange(list: Chapter[], id: string, patch: Partial<Pick<Chapter, 'start' | 'end'>>): Chapter[] {
  return list.map((c) => (c.id === id ? { ...c, ...patch } : c))
}

export function remove(list: Chapter[], id: string): Chapter[] {
  return list.filter((c) => c.id !== id)
}

/** Joins a chapter with the one after it in the list: first title, the full span of both. */
export function mergeWithNext(list: Chapter[], id: string): Chapter[] {
  const i = list.findIndex((c) => c.id === id)
  const a = list[i]
  const b = list[i + 1]
  if (!a || !b) return list
  const merged = { ...a, start: Math.min(a.start, b.start), end: Math.max(a.end, b.end) }
  return byStart([...list.slice(0, i), merged, ...list.slice(i + 2)])
}

/** True when `page` can start a second part: after the chapter's first page, no later than its last. */
export const canSplitAt = (c: Chapter, page: number) => Number.isInteger(page) && page > c.start && page <= c.end

/** Splits a chapter so a new one starts at `page`. */
export function splitAt(list: Chapter[], id: string, page: number): Chapter[] {
  const c = list.find((x) => x.id === id)
  if (!c || !canSplitAt(c, page)) return list
  const second: Chapter = { id: newChapterId(), title: `${c.title} (part 2)`, start: page, end: c.end }
  return byStart([...list.filter((x) => x.id !== id), { ...c, end: page - 1 }, second])
}

/** The first run of pages no chapter covers, or the last page when everything is covered. */
export function firstGap(list: Chapter[], total: number): { start: number; end: number } {
  let next = 1
  for (const c of byStart(list.filter((c) => Number.isFinite(c.start) && Number.isFinite(c.end)))) {
    if (c.start > next) return { start: next, end: c.start - 1 }
    next = Math.max(next, c.end + 1)
  }
  return next <= total ? { start: next, end: total } : { start: total, end: total }
}

export function add(list: Chapter[], total: number, title: string): Chapter[] {
  const gap = firstGap(list, total)
  return byStart([...list, { id: newChapterId(), title, ...gap }])
}

export type ChapterErrors = Partial<Record<'title' | 'start' | 'end', string>>

/**
 * Problems per chapter id: a name, whole numbers inside the file, start no later than end, no overlaps.
 * `unit` is "page" or "line", `total` how many the file has.
 */
export function validate(list: Chapter[], total: number, unit: 'page' | 'line'): Record<string, ChapterErrors> {
  const out: Record<string, ChapterErrors> = {}
  const set = (id: string, field: keyof ChapterErrors, message: string) => ((out[id] ??= {})[field] ??= message)
  const inside = (n: number) => Number.isInteger(n) && n >= 1 && n <= total

  for (const c of list) {
    if (!c.title.trim()) set(c.id, 'title', 'Give this chapter a name.')
    if (!inside(c.start)) set(c.id, 'start', `Use a ${unit} from 1 to ${total}.`)
    if (!inside(c.end)) set(c.id, 'end', `Use a ${unit} from 1 to ${total}.`)
    else if (inside(c.start) && c.start > c.end) set(c.id, 'end', 'The end can’t come before the start.')
  }

  const ok = byStart(list.filter((c) => !out[c.id]?.start && !out[c.id]?.end))
  for (let i = 1; i < ok.length; i++) {
    const prev = ok.slice(0, i).reduce((a, b) => (b.end > a.end ? b : a))
    if (ok[i].start <= prev.end) {
      set(ok[i].id, 'start', `This overlaps “${prev.title.trim() || 'another chapter'}” (${unit}s ${prev.start} to ${prev.end}).`)
    }
  }
  return out
}

export const hasErrors = (errors: Record<string, ChapterErrors>) => Object.values(errors).some((e) => e.title || e.start || e.end)
