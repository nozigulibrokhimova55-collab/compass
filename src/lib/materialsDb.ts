// Queries for a teacher's uploaded files (materials, their page text and chapters) and the file itself in
// Storage. Tables come from supabase/migrations/20261120000001_uploaded_materials.sql. Pages never import the
// Supabase client directly.

import { getBook, isUploadBook, materialIdOf, registerBook, STORAGE_BUCKET } from './books'
import { materialBook } from './materials/asBook'
import { pagesForSaving, tidy } from './materials/cleanText'
import type { Chapter, SourceDoc, SourceKind } from './materials/types'
import { supabase } from './supabase'

export const MATERIALS_MIGRATION = 'supabase/migrations/20261120000001_uploaded_materials.sql'

/** Thrown when the materials tables don't exist yet, so pages can say what to run. */
export class MaterialsNotSetUpError extends Error {
  constructor() {
    super(`Saving files isn’t switched on yet. Run ${MATERIALS_MIGRATION} in the Supabase SQL Editor.`)
  }
}

function client() {
  if (!supabase) throw new Error('Supabase is not set up. Add the two keys from .env.example.')
  return supabase
}

function check(error: { code?: string; message: string } | null) {
  if (!error) return
  if (error.code === 'PGRST205' || error.code === 'PGRST202' || error.code === '42P01' || error.code === '42883') throw new MaterialsNotSetUpError()
  throw error
}

export type Material = {
  id: string
  classId: string
  title: string
  filePath: string
  fileType: SourceKind
  pageCount: number
  attribution: string | null
  createdAt: string
}

/** A saved chapter. `id` is the database id, so "Re-check chapters" keeps it. */
export type MaterialChapter = Chapter & { position: number }

const MATERIAL_COLUMNS = 'id, class_id, title, file_path, file_type, page_count, attribution, created_at'
type MaterialRow = { id: string; class_id: string; title: string; file_path: string; file_type: SourceKind; page_count: number; attribution: string | null; created_at: string }
type ChapterRow = { id: string; material_id: string; position: number; title: string; start_page: number; end_page: number }

const toMaterial = (r: MaterialRow): Material => ({
  id: r.id,
  classId: r.class_id,
  title: r.title,
  filePath: r.file_path,
  fileType: r.file_type,
  pageCount: r.page_count,
  attribution: r.attribution,
  createdAt: r.created_at,
})
const toChapter = (r: ChapterRow): MaterialChapter => ({ id: r.id, position: r.position, title: r.title, start: r.start_page, end: r.end_page })

export const fileTypeLabel = (t: SourceKind) => ({ pdf: 'PDF', md: 'Markdown', txt: 'Text' })[t]
export const unitOf = (t: SourceKind) => (t === 'pdf' ? 'page' : 'line')

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** A class's uploaded files, newest first. */
export async function fetchMaterials(classId: string): Promise<Material[]> {
  const { data, error } = await client().from('materials').select(MATERIAL_COLUMNS).eq('class_id', classId).order('created_at', { ascending: false })
  check(error)
  return ((data ?? []) as MaterialRow[]).map(toMaterial)
}

/** Chapters of some materials, in page order, keyed by material id. */
async function fetchChapters(materialIds: string[]): Promise<Map<string, MaterialChapter[]>> {
  const out = new Map<string, MaterialChapter[]>(materialIds.map((id) => [id, []]))
  if (!materialIds.length) return out
  const { data, error } = await client().from('material_chapters').select('id, material_id, position, title, start_page, end_page').in('material_id', materialIds).order('position')
  check(error)
  for (const r of (data ?? []) as ChapterRow[]) out.get(r.material_id)?.push(toChapter(r))
  return out
}

/** One file and its chapters, or null if it doesn't exist or isn't this person's to see. */
export async function fetchMaterial(id: string): Promise<{ material: Material; chapters: MaterialChapter[] } | null> {
  const { data, error } = await client().from('materials').select(MATERIAL_COLUMNS).eq('id', id).maybeSingle()
  check(error)
  if (!data) return null
  const chapters = (await fetchChapters([id])).get(id) ?? []
  return { material: toMaterial(data as MaterialRow), chapters }
}

/** Saved page text from `from` to `to` (teachers only). Fetched in pages of 1000 rows, the API's limit. */
export async function fetchPageTexts(materialId: string, from = 1, to = Number.MAX_SAFE_INTEGER): Promise<string[]> {
  const out: string[] = []
  const step = 1000
  for (let offset = 0; ; offset += step) {
    const { data, error } = await client()
      .from('material_pages')
      .select('page_number, text')
      .eq('material_id', materialId)
      .gte('page_number', from)
      .lte('page_number', to)
      .order('page_number')
      .range(offset, offset + step - 1)
    check(error)
    const rows = (data ?? []) as { page_number: number; text: string }[]
    for (const r of rows) out.push(r.text)
    if (rows.length < step) return out
  }
}

/** The clean text of a chapter, ready for the quiz notes box. */
export async function fetchChapterText(material: Material, chapter: { start: number; end: number }): Promise<string> {
  const pages = await fetchPageTexts(material.id, chapter.start, chapter.end)
  return tidy(pages.join(material.fileType === 'pdf' ? '\n\n' : '\n'))
}

/** A link that opens the original file (valid for an hour), at a page for PDFs. Teachers only. */
export async function materialFileLink(material: Material, page?: number): Promise<string> {
  const { data, error } = await client().storage.from(STORAGE_BUCKET).createSignedUrl(material.filePath, 3600)
  if (error || !data) throw error ?? new Error('No link')
  return material.fileType === 'pdf' && page ? `${data.signedUrl}#page=${page}` : data.signedUrl
}

/**
 * Makes getBook() work for calendars built from uploaded files: loads each "upload-…" book's chapters once
 * and registers it. Students and parents can read titles and chapters (never page text), so this works for them too.
 */
export async function ensureUploadedBooks(bookIds: (string | null | undefined)[]) {
  const missing = [...new Set(bookIds.filter((id): id is string => isUploadBook(id) && !getBook(id)).map(materialIdOf))]
  if (!missing.length) return
  const { data, error } = await client().from('materials').select(MATERIAL_COLUMNS).in('id', missing)
  check(error)
  const chapters = await fetchChapters(missing)
  for (const m of ((data ?? []) as MaterialRow[]).map(toMaterial)) registerBook(materialBook(m, chapters.get(m.id) ?? []))
}

/** Registers (or refreshes) the book for a file the teacher just loaded or changed. */
export function registerMaterialBook(material: Material, chapters: MaterialChapter[]) {
  registerBook(materialBook(material, chapters))
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

const CONTENT_TYPE: Record<SourceKind, string> = { pdf: 'application/pdf', md: 'text/markdown', txt: 'text/plain' }

export type SaveStep = 'uploading' | 'saving'

/**
 * Uploads the original file to <class>/<new id>/original.<ext>, then saves the clean page text and the chapters
 * in one step (create_material). If that step fails, the uploaded file is removed again.
 */
export async function saveMaterial(input: {
  classId: string
  file: File
  doc: SourceDoc
  chapters: Chapter[]
  title: string
  attribution: string
  onStep?: (step: SaveStep) => void
}): Promise<string> {
  const { classId, file, doc, chapters } = input
  const id = crypto.randomUUID()
  const path = `${classId}/${id}/original.${doc.kind}`
  const storage = client().storage.from(STORAGE_BUCKET)

  input.onStep?.('uploading')
  const { error: upError } = await storage.upload(path, file, { contentType: CONTENT_TYPE[doc.kind], upsert: false })
  if (upError) {
    console.error('Upload failed', upError)
    throw new Error(/size|large/i.test(upError.message) ? 'This file is too big to upload. Try one under 50 MB.' : 'We couldn’t upload the file. Try again.')
  }

  input.onStep?.('saving')
  const sorted = [...chapters].sort((a, b) => a.start - b.start)
  const { error } = await client().rpc('create_material', {
    p_material: { id, class_id: classId, title: input.title.trim(), file_type: doc.kind, rights_confirmed: true, attribution: input.attribution.trim() },
    p_pages: pagesForSaving(doc, sorted),
    p_chapters: sorted.map((c) => ({ title: c.title.trim(), start_page: c.start, end_page: c.end })),
  })
  if (error) {
    await storage.remove([path]).catch(() => undefined)
    check(error)
  }
  return id
}

/** Saves the chapters after "Re-check chapters". Chapters that came from the database keep their ids. */
export async function saveMaterialChapters(materialId: string, chapters: Chapter[]): Promise<void> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  const { error } = await client().rpc('save_material_chapters', {
    p_material: materialId,
    p_chapters: chapters.map((c) => ({ id: uuid.test(c.id) ? c.id : null, title: c.title.trim(), start_page: c.start, end_page: c.end })),
  })
  check(error)
}

export async function renameMaterial(materialId: string, title: string, attribution: string): Promise<void> {
  const { error } = await client().from('materials').update({ title: title.trim(), attribution: attribution.trim() || null }).eq('id', materialId)
  check(error)
}

/** Deletes the rows (blocked while the class calendar uses the file), then the file in Storage. */
export async function deleteMaterial(materialId: string): Promise<void> {
  const { data, error } = await client().rpc('delete_material', { p_material: materialId })
  check(error)
  if (typeof data === 'string') {
    const { error: rmError } = await client().storage.from(STORAGE_BUCKET).remove([data])
    if (rmError) console.error('The file stayed in Storage', rmError)
  }
}
