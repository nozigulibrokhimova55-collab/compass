// Uploads a textbook's chapter PDFs to Supabase Storage and links the book to a class as course material.
//
//   npm run seed:materials -- <folder with the PDFs>
//   npm run seed:materials -- <folder> --book conceptual-physics --teacher elena.markovic@example.com --class Physics
//
// The defaults link Conceptual Physics to Physics (Elena Markovic's class from npm run seed:accounts).
// The book's syllabus.json must already be in src/data/books/<book>/; PDFs go to course-materials/<book>/<file>.
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, and the migration
// supabase/migrations/20261106000001_syllabus_calendar.sql run first. Safe to run again.

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const BUCKET = 'course-materials'

class SetupError extends Error {}
function fail(message: string): never {
  throw new SetupError(message)
}

function arg(name: string, fallback: string) {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

async function main() {
  const folder = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : fail('Give the folder with the PDFs: npm run seed:materials -- <folder>')
  const bookId = arg('book', 'conceptual-physics')
  const teacherEmail = arg('teacher', 'elena.markovic@example.com').toLowerCase()
  const className = arg('class', 'Physics')

  const url = process.env.SUPABASE_URL?.trim() || fail('SUPABASE_URL is missing from .env.local.')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || fail('SUPABASE_SERVICE_ROLE_KEY is missing from .env.local.')
  if (key.startsWith('sb_publishable_')) fail('SUPABASE_SERVICE_ROLE_KEY is the publishable (anon) key. Use the service_role or secret key.')
  for (const [name, value] of Object.entries(process.env)) {
    if (name.startsWith('VITE_') && value?.trim() === key) fail(`${name} holds the service role key. Remove it: VITE_ variables are sent to every browser.`)
  }

  const syllabusPath = join('src', 'data', 'books', bookId, 'syllabus.json')
  if (!existsSync(syllabusPath)) fail(`No ${syllabusPath}. Add the book's syllabus.json there first.`)
  const syllabus = JSON.parse(readFileSync(syllabusPath, 'utf8')) as { title: string; chapters: { number: number; file: string }[] }
  const files = syllabus.chapters.map((c) => c.file)
  const missing = files.filter((f) => !existsSync(join(folder, f)))
  if (missing.length) fail(`These PDFs aren't in ${folder}: ${missing.join(', ')}`)

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  // The migration has to be in place: it makes the course_materials table and the bucket's read rule.
  // (A plain select, not a head-only count: a count request doesn't report a missing table.)
  const probe = await admin.from('course_materials').select('id').limit(1)
  if (probe.error) fail(`The course_materials table isn't there yet. Run supabase/migrations/20261106000001_syllabus_calendar.sql in the SQL Editor first. (${probe.error.message})`)

  // Bucket (the migration creates it too; this covers projects where storage inserts weren't allowed).
  const { data: bucket } = await admin.storage.getBucket(BUCKET)
  if (!bucket) {
    const { error } = await admin.storage.createBucket(BUCKET, { public: false, allowedMimeTypes: ['application/pdf'] })
    if (error) fail(`Could not create the ${BUCKET} bucket: ${error.message}`)
  }

  // Upload chapter PDFs that aren't there yet.
  const { data: existing, error: listError } = await admin.storage.from(BUCKET).list(bookId, { limit: 1000 })
  if (listError) fail(`Could not list ${BUCKET}/${bookId}: ${listError.message}`)
  const have = new Set((existing ?? []).map((f) => f.name))
  let uploaded = 0
  for (const file of files) {
    if (have.has(file)) continue
    const { error } = await admin.storage.from(BUCKET).upload(`${bookId}/${file}`, readFileSync(join(folder, file)), { contentType: 'application/pdf', upsert: false })
    if (error) fail(`Could not upload ${file}: ${error.message}`)
    uploaded++
  }

  // Link the book to the class.
  const { data: teacher, error: tErr } = await admin.from('profiles').select('id').eq('email', teacherEmail).eq('role', 'teacher').maybeSingle()
  if (tErr) fail(`Could not look up ${teacherEmail}: ${tErr.message}`)
  if (!teacher) fail(`No teacher ${teacherEmail}. Run npm run seed:accounts first, or pass --teacher.`)
  const { data: cls, error: cErr } = await admin.from('classes').select('id, name, code').eq('teacher_id', teacher.id).eq('name', className).maybeSingle()
  if (cErr) fail(`Could not look up the class: ${cErr.message}`)
  if (!cls) fail(`${teacherEmail} has no class named "${className}".`)
  const { error: linkError } = await admin.from('course_materials').upsert({ class_id: cls.id, book_id: bookId }, { onConflict: 'class_id,book_id', ignoreDuplicates: true })
  if (linkError) fail(`Could not link the book: ${linkError.message}`)

  console.log(`Uploaded ${uploaded} of ${files.length} PDFs (the rest were already there). ${syllabus.title} is course material for ${cls.name} (${cls.code}).`)
}

main().catch((err: unknown) => {
  console.error(err instanceof SetupError ? err.message : `Something went wrong: ${err instanceof Error ? err.message : String(err)}`)
  process.exitCode = 1
})
