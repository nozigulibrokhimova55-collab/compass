// Creates test accounts for every role, so you can log in as a teacher, a student or a parent.
//
//   npm run seed:accounts
//
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local. The service role key skips every
// security rule, so it lives only here: never in src/, never with a VITE_ prefix, never committed.
//
// Accounts are made the same way normal sign-up makes them: the handle_new_user trigger in
// supabase/schema.sql reads the user metadata and creates the profile, the teacher's class, the
// student's first enrollment and invite code, and the parent link. The script then enrolls each
// student in the other classes. Running it again skips accounts that already exist.
// Logins go to test-accounts.local.md (git-ignored). Nothing secret is printed.

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { randomInt } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const OUT_FILE = 'test-accounts.local.md'

type Teacher = { email: string; name: string; className: string }
type Student = { email: string; name: string }
type Parent = { email: string; name: string; childEmail: string }

const TEACHERS: Teacher[] = [
  { email: 'elena.markovic@example.com', name: 'Elena Markovic', className: 'Physics' },
  { email: 'kwame.mensah@example.com', name: 'Kwame Mensah', className: 'Chemistry' },
  { email: 'priya.raman@example.com', name: 'Priya Raman', className: 'Biology' },
  { email: 'tomas.herrera@example.com', name: 'Tomas Herrera', className: 'Mathematics' },
  { email: 'hannah.whitfield@example.com', name: 'Hannah Whitfield', className: 'English Language & Literature' },
  { email: 'lucia.fernandez@example.com', name: 'Lucia Fernandez', className: 'Spanish' },
  { email: 'daniel.okafor@example.com', name: 'Daniel Okafor', className: 'World History' },
  { email: 'aiko.tanaka@example.com', name: 'Aiko Tanaka', className: 'Geography' },
  { email: 'omar.haddad@example.com', name: 'Omar Haddad', className: 'Economics' },
  { email: 'sofia.lindqvist@example.com', name: 'Sofia Lindqvist', className: 'Computer Science' },
  { email: 'mateo.rossi@example.com', name: 'Mateo Rossi', className: 'Visual Arts' },
  { email: 'jonas.becker@example.com', name: 'Jonas Becker', className: 'Physical Education & Health' },
]

/** Grade 10A. Every student is enrolled in all of the classes above. */
const STUDENTS: Student[] = [
  { email: 'lucas.moreau@example.com', name: 'Lucas Moreau' },
  { email: 'aisha.bello@example.com', name: 'Aisha Bello' },
  { email: 'nikolai.petrov@example.com', name: 'Nikolai Petrov' },
  { email: 'mei.chen@example.com', name: 'Mei Chen' },
]

/** Mei Chen has no parent here on purpose, to test the invite code flow through normal sign-up. */
const PARENTS: Parent[] = [
  { email: 'claire.moreau@example.com', name: 'Claire Moreau', childEmail: 'lucas.moreau@example.com' },
  { email: 'ibrahim.bello@example.com', name: 'Ibrahim Bello', childEmail: 'aisha.bello@example.com' },
  { email: 'anna.petrova@example.com', name: 'Anna Petrova', childEmail: 'nikolai.petrov@example.com' },
]

class SetupError extends Error {}

function fail(message: string): never {
  throw new SetupError(message)
}

// ---------------------------------------------------------------------------
// Safety checks before touching anything
// ---------------------------------------------------------------------------

function readEnv() {
  const url = process.env.SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url) fail('SUPABASE_URL is missing from .env.local.')
  if (!key) fail('SUPABASE_SERVICE_ROLE_KEY is missing from .env.local.')
  if (key.startsWith('sb_publishable_')) fail('SUPABASE_SERVICE_ROLE_KEY is the publishable (anon) key. Use the service_role or secret key.')
  // The frontend only ever sees VITE_ variables. Make sure the admin key isn't one of them.
  for (const [name, value] of Object.entries(process.env)) {
    if (name.startsWith('VITE_') && value?.trim() === key) fail(`${name} holds the service role key. Remove it: VITE_ variables are sent to every browser.`)
  }
  return { url, key }
}

function assertIgnored(file: string) {
  try {
    execFileSync('git', ['check-ignore', '-q', file], { stdio: 'ignore' })
  } catch {
    fail(`${file} is not ignored by git. Add it to .gitignore first, so the passwords can't be committed.`)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const ALL = LOWER + UPPER + DIGITS

/** 20 random characters with at least one lowercase letter, one uppercase letter and one digit. */
function strongPassword() {
  const pick = (set: string) => set[randomInt(set.length)]
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), ...Array.from({ length: 17 }, () => pick(ALL))]
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

/** Passwords already written to the logins file, so a second run keeps them in the file. */
function savedPasswords(): Map<string, string> {
  const map = new Map<string, string>()
  if (!existsSync(OUT_FILE)) return map
  for (const line of readFileSync(OUT_FILE, 'utf8').split('\n')) {
    const cells = line.split('|').map((c) => c.trim())
    // | Name | Email | Password | ... |
    const email = cells[2]
    const password = cells[3]?.replace(/^`|`$/g, '')
    if (email?.includes('@') && password && !password.startsWith('(')) map.set(email.toLowerCase(), password)
  }
  return map
}

async function allUsers(admin: SupabaseClient): Promise<Map<string, User>> {
  const users = new Map<string, User>()
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) fail(`Could not list users: ${error.message}`)
    for (const u of data.users) if (u.email) users.set(u.email.toLowerCase(), u)
    if (data.users.length < 1000) return users
  }
}

type Result = { email: string; name: string; password: string; created: boolean; detail: string }

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { url, key } = readEnv()
  assertIgnored(OUT_FILE)

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const existing = await allUsers(admin)
  const kept = savedPasswords()
  let created = 0

  /** Creates the auth user (the trigger does the rest), or finds the one that already exists. */
  async function ensureUser(email: string, metadata: Record<string, string>): Promise<{ id: string; password: string; created: boolean }> {
    const found = existing.get(email)
    if (found) return { id: found.id, password: kept.get(email) ?? '(existing account, password unchanged)', created: false }
    const password = strongPassword()
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata })
    if (error || !data.user) fail(`Could not create ${email}: ${error?.message ?? 'no user returned'}`)
    existing.set(email, data.user)
    created++
    return { id: data.user.id, password, created: true }
  }

  async function profileOf(id: string, email: string) {
    const { data, error } = await admin.from('profiles').select('id, name, role, invite_code').eq('id', id).maybeSingle()
    if (error) fail(`Could not read the profile for ${email}: ${error.message}`)
    if (!data) fail(`${email} has no profile. Run supabase/schema.sql in the SQL Editor first: its sign-up trigger creates profiles.`)
    return data as { id: string; name: string; role: string; invite_code: string | null }
  }

  // Teachers, each with their class (the trigger creates it from class_name).
  const results: Record<'teachers' | 'students' | 'parents', Result[]> = { teachers: [], students: [], parents: [] }
  const classes: { id: string; name: string; code: string; teacher: string }[] = []
  for (const t of TEACHERS) {
    const user = await ensureUser(t.email, { name: t.name, role: 'teacher', class_name: t.className, language: 'English' })
    const profile = await profileOf(user.id, t.email)
    if (profile.role !== 'teacher') fail(`${t.email} already exists as a ${profile.role}, not a teacher. Remove it in Supabase and run again.`)
    const { data: cls, error } = await admin.from('classes').select('id, name, code').eq('teacher_id', user.id).eq('name', t.className).maybeSingle()
    if (error) fail(`Could not read ${t.className}: ${error.message}`)
    if (!cls) fail(`${t.email} exists but has no "${t.className}" class. Remove the account in Supabase and run again.`)
    classes.push({ ...cls, teacher: t.name })
    results.teachers.push({ email: t.email, name: t.name, password: user.password, created: user.created, detail: `${cls.name} · class code \`${cls.code}\`` })
  }

  // Students: the trigger enrolls them in the first class and gives them an invite code; we add the rest.
  const inviteCodes = new Map<string, { id: string; code: string; name: string }>()
  for (const s of STUDENTS) {
    const user = await ensureUser(s.email, { name: s.name, role: 'student', class_code: classes[0].code, language: 'English' })
    const profile = await profileOf(user.id, s.email)
    if (profile.role !== 'student') fail(`${s.email} already exists as a ${profile.role}, not a student. Remove it in Supabase and run again.`)
    if (!profile.invite_code) fail(`${s.email} has no invite code. Run supabase/schema.sql again, then rerun this script.`)
    const rows = classes.map((c) => ({ class_id: c.id, student_id: user.id }))
    const { error } = await admin.from('class_members').upsert(rows, { onConflict: 'class_id,student_id', ignoreDuplicates: true })
    if (error) fail(`Could not enroll ${s.email}: ${error.message}`)
    inviteCodes.set(s.email, { id: user.id, code: profile.invite_code, name: s.name })
    results.students.push({ email: s.email, name: s.name, password: user.password, created: user.created, detail: `Grade 10A · all ${classes.length} classes · parent invite code \`${profile.invite_code}\`` })
  }

  // Parents, linked to their child (the trigger links them from invite_code; the upsert makes sure).
  for (const p of PARENTS) {
    const child = inviteCodes.get(p.childEmail) ?? fail(`No student ${p.childEmail} for ${p.email}.`)
    const user = await ensureUser(p.email, { name: p.name, role: 'parent', invite_code: child.code, language: 'English' })
    const profile = await profileOf(user.id, p.email)
    if (profile.role !== 'parent') fail(`${p.email} already exists as a ${profile.role}, not a parent. Remove it in Supabase and run again.`)
    const { error } = await admin.from('parent_links').upsert({ parent_id: user.id, student_id: child.id }, { onConflict: 'parent_id,student_id', ignoreDuplicates: true })
    if (error) fail(`Could not link ${p.email} to ${child.name}: ${error.message}`)
    results.parents.push({ email: p.email, name: p.name, password: user.password, created: user.created, detail: `Parent of ${child.name}` })
  }

  // Write the logins file (checked again right before writing).
  assertIgnored(OUT_FILE)
  const table = (rows: Result[], last: string) =>
    [`| Name | Email | Password | ${last} |`, '|---|---|---|---|', ...rows.map((r) => `| ${r.name} | ${r.email} | ${r.password.startsWith('(') ? r.password : `\`${r.password}\``} | ${r.detail} |`)].join('\n')
  const mei = inviteCodes.get('mei.chen@example.com')
  const md = `# Compass test accounts

Local only. This file is git-ignored: don't commit it or share it. Log in at /login.
Run \`npm run seed:accounts\` again any time; existing accounts are skipped.

## Teachers

${table(results.teachers, 'Class')}

## Students (Grade 10A)

${table(results.students, 'Details')}

## Parents

${table(results.parents, 'Linked to')}

## Try the parent invite flow

Mei Chen has no parent yet. Sign up at /signup as a parent and use her invite code: \`${mei?.code ?? '(missing)'}\`.
`
  writeFileSync(OUT_FILE, md, { mode: 0o600 })
  console.log(`Created ${created} accounts, see ${OUT_FILE}`)
}

main().catch((err: unknown) => {
  // Only our own messages are printed; they never contain keys or passwords.
  console.error(err instanceof SetupError ? err.message : `Something went wrong: ${err instanceof Error ? err.message : String(err)}`)
  process.exitCode = 1
})
