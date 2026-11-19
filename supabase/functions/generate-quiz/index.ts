// Supabase Edge Function: writes quiz questions with the configured language model (see llm.ts for the secrets).
// Keys live here as secrets, never in the browser.
//
//   supabase secrets set LLM_PROVIDER=gemini LLM_API_KEY=your-key LLM_MODEL=your-model
//   supabase functions deploy generate-quiz
//
// Two kinds of request, both from a signed-in teacher:
//   { chapter_id, options: { count, types, difficulty, exclude?, focus? } }   (focus: what the teacher wants covered)
//       Loads that chapter's saved page text here on the server (only the class's teacher can), asks the model per
//       chunk of about 40,000 characters, checks every question with zod (one retry when a reply is unusable),
//       drops questions citing pages outside the chapter and near-duplicates.
//   { notes, topicId, count, difficulty, exclude? }
//       The older notes box: questions from pasted notes. Kept until notes are migrated to chapters.
//
// Only book or note text goes to the model. No names, emails or anything else about people.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import {
  buildChapterPrompt,
  CHAPTER_SYSTEM_PROMPT,
  chapterResponseSchema,
  checkChapterInput,
  chunkPages,
  dropNearDuplicates,
  InvalidOutputError,
  parseChapterQuestions,
  splitCount,
  withSpare,
  type ChapterInput,
  type ChapterQuestion,
  type Page,
  type QuestionType,
} from './chapter.ts'
import { callLlm, llmConfig, LlmError, type LlmConfig } from './llm.ts'
import { buildPrompt, checkInput, InputError, parseQuestions, RESPONSE_SCHEMA, SYSTEM_PROMPT } from './validate.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** A failure with a message that is safe to show the teacher. */
class Friendly extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' })

  // Only signed-in teachers may spend the model's quota.
  const auth = req.headers.get('Authorization')
  if (!auth) return reply(401, { error: 'Log in first.' })
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return reply(401, { error: 'Log in first.' })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
  if (profile?.role !== 'teacher') return reply(403, { error: 'Only teachers can make quizzes.' })

  const body = await req.json().catch(() => null)
  const cfg = llmConfig((name) => Deno.env.get(name))
  if ('problem' in cfg) {
    console.error('LLM is not set up:', cfg.problem)
    return reply(500, { error: 'Question writing is not set up yet. Ask whoever runs Compass to add the AI key.' })
  }

  try {
    if (body && typeof body === 'object' && 'chapter_id' in body) {
      const input = checkChapterInput(body)
      return reply(200, await chapterQuiz(supabase, userData.user.id, cfg, input))
    }
    const input = checkInput(body)
    const raw = await callLlm(cfg, { system: SYSTEM_PROMPT, user: buildPrompt(input), schema: RESPONSE_SCHEMA, temperature: 0.7, timeoutMs: 50_000 })
    return reply(200, { questions: parseQuestions(raw, input) })
  } catch (err) {
    if (err instanceof InputError) return reply(400, { error: err.message })
    if (err instanceof Friendly) return reply(err.status, { error: err.message })
    if (err instanceof LlmError) {
      console.error('Model error', err.message)
      if (err.status === 429) return reply(429, { error: 'The AI is busy right now. Wait a minute and try again.' })
      return reply(502, { error: 'The AI could not write questions right now. Try again in a moment.' })
    }
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      console.error('Model timed out', err)
      return reply(504, { error: 'The AI took too long. Try again, or ask for fewer questions.' })
    }
    console.error('generate-quiz failed', err)
    return reply(502, { error: err instanceof Error ? err.message : 'Something went wrong. Try again.' })
  }
})

type ChapterRow = { id: string; title: string; start_page: number; end_page: number; material_id: string; materials: { class_id: string; classes: { teacher_id: string } } }

async function chapterQuiz(supabase: SupabaseClient, userId: string, cfg: LlmConfig, input: ChapterInput) {
  // Row level security only shows a chapter to its class's teacher (and, read-only, the class); check the teacher too.
  const { data, error } = await supabase
    .from('material_chapters')
    .select('id, title, start_page, end_page, material_id, materials!inner(class_id, classes!inner(teacher_id))')
    .eq('id', input.chapterId)
    .maybeSingle()
  if (error) {
    console.error('Could not load the chapter', error)
    throw new Friendly(500, 'We couldn’t load that chapter. Try again.')
  }
  const chapter = data as unknown as ChapterRow | null
  if (!chapter || chapter.materials?.classes?.teacher_id !== userId) throw new Friendly(404, 'We couldn’t find that chapter.')

  const pages = await loadPages(supabase, chapter.material_id, chapter.start_page, chapter.end_page)
  if (pages.every((p) => !p.text.trim())) throw new Friendly(422, 'This chapter has no text we can read.')

  const { count, types, difficulty, exclude, focus } = input.options
  const chunks = chunkPages(pages.filter((p) => p.text.trim()))
  const shares = splitCount(count, chunks.map((c) => c.reduce((n, p) => n + p.text.length, 0)))
  const range = { first: chapter.start_page, last: chapter.end_page, types }

  // Chunks run side by side, so a long chapter takes about as long as a short one.
  const results = await Promise.all(
    chunks.map((chunk, i) => (shares[i] > 0 ? askChunk(cfg, { title: chapter.title, pages: chunk, count: withSpare(shares[i]), types, difficulty, exclude, focus }, range) : Promise.resolve([]))),
  )
  // Take each chunk's share first (in page order), then fill up from the spares, skipping near-duplicates.
  const firstPick = results.flatMap((qs, i) => qs.slice(0, shares[i]))
  const spares = results.flatMap((qs, i) => qs.slice(shares[i]))
  const questions = dropNearDuplicates([...firstPick, ...spares], exclude).slice(0, count)
  if (questions.length === 0) throw new Friendly(502, 'The AI did not write any usable questions. Try again.')

  return {
    questions,
    requested: count,
    chapter: { id: chapter.id, title: chapter.title, start: chapter.start_page, end: chapter.end_page },
  }
}

/** One chunk: ask, check, and ask once more if the reply was unusable. */
async function askChunk(
  cfg: LlmConfig,
  prompt: { title: string; pages: Page[]; count: number; types: QuestionType[]; difficulty: 'gentle' | 'medium' | 'stretch'; exclude: string[]; focus: string },
  range: { first: number; last: number; types: QuestionType[] },
): Promise<ChapterQuestion[]> {
  const request = { system: CHAPTER_SYSTEM_PROMPT, user: buildChapterPrompt(prompt), schema: chapterResponseSchema(prompt.types), timeoutMs: 55_000 }
  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await callLlm(cfg, request)
    try {
      const { questions, dropped } = parseChapterQuestions(raw, range)
      if (dropped.length) console.warn(`Dropped ${dropped.length} question(s)`, dropped.map((d) => d.reason))
      return questions
    } catch (err) {
      if (!(err instanceof InvalidOutputError)) throw err
      console.warn(`Unusable reply (attempt ${attempt})`, err.message)
      if (attempt === 2) throw new Friendly(502, 'The AI sent back questions we couldn’t use, twice. Try again.')
    }
  }
  return []
}

async function loadPages(supabase: SupabaseClient, materialId: string, first: number, last: number): Promise<Page[]> {
  const out: Page[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('material_pages')
      .select('page_number, text')
      .eq('material_id', materialId)
      .gte('page_number', first)
      .lte('page_number', last)
      .order('page_number')
      .range(offset, offset + 999)
    if (error) {
      console.error('Could not load pages', error)
      throw new Friendly(500, 'We couldn’t load that chapter’s text. Try again.')
    }
    for (const r of data ?? []) out.push({ page: r.page_number as number, text: (r.text as string) ?? '' })
    if (!data || data.length < 1000) return out
  }
}
