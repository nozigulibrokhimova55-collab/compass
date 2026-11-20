# Compass

Vite, React, TypeScript, Tailwind 3, React Router and Supabase, for high school science classes. There is no demo anymore: every area needs a real Supabase login. Without keys, log in and sign up show a note that accounts aren't switched on. Screens that need data the database doesn't have yet read it from `src/lib/sampleData.ts` through small hooks (teacher: `useDayTopic`, `useMisconceptions`, `useReviewPlans`; student: `useConfidence`, `useTopicProgress`, `useRetrySchedule`, `useCatchUpCheck`; parent: `useChildren`, `useParentUpdates`, `useMessages`, `useParentSettings`), each with a TODO(Mauricio) saying what Supabase needs. Anything from that file shows a beige `SampleTag` or `SampleNote` (`components/area/AreaBits.tsx`). Teacher changes to sample data (today's topic, approvals, "this is wrong") are kept in the browser only. The older `src/lib/sample.ts` and `studentDemo.ts` are still used by Mauricio's `classData.tsx`. Tokens live in `tailwind.config.js`; global CSS in `src/index.css`.

## Supabase

- Setup steps are in `README.md`. `supabase/schema.sql` is the source of truth for tables, the sign-up trigger and row level security; run it in the SQL Editor (safe to rerun).
- All queries live in `src/lib/db.ts`. Pages and components never import the Supabase client directly. If a table or column changes in `schema.sql`, change `db.ts` with it.
- `useSession()` still has `isDemo` and `DEMO_SESSION` (Mauricio's code, left as is), but nothing can open the demo anymore, so inside the areas `isDemo` is always false. `ClearOldDemoSession` in `App.tsx` clears any old browser-only session (one without a Supabase id).
- `ClassDataProvider` (`src/lib/classData.tsx`) loads the class, roster and quizzes once per area. Teacher pages read it with `useClassData()` and `useAttendance()`.
- `/teacher`, `/student` and `/parent` need a login and each person can only open their own area (`Protected` in `App.tsx`). Without keys they redirect to `/login`.
- Only the anon key goes in `.env.local`. Never use or commit the `service_role` key.
- Real accounts start empty: no sample misconceptions, scores or students. Show a short empty state instead of fake numbers.

## Syllabus calendar (in progress, stages 1 and 2 of 4)

- Books: `src/data/books/<id>/syllabus.json` plus one entry in `BOOKS` (`src/lib/books.ts`). `leadingPages` is how many pages each chapter PDF has before its first printed page (Conceptual Physics: 2, a blank page and the license). Chapter PDFs live in the private Storage bucket `course-materials` at `<book id>/<file>`; upload them with `npm run seed:materials -- <folder>` (service role key, also links the book to Elena Markovic's Physics class).
- Every quiz or page made from a book shows `BookAttribution` (the syllabus `attribution`). Quizzes use section text only, never images.
- Tables: `supabase/migrations/20261106000001_syllabus_calendar.sql` (`course_materials`, `class_schedules`, `class_sessions`, the `save_class_calendar` function, the bucket's read rule). Run it in the SQL Editor after `schema.sql`. Queries live in `src/lib/courseDb.ts` (not `db.ts`); pages load through `useCourse(classId)`.
- `src/lib/schedulePlan.ts` is the pure planner: one session per class day, each section takes its `suggested_classes` (one each when squeezed), a chapter quiz after each chapter, spare days become "Review / flexible". Past sessions never change (enforced by row level security).
- `/teacher/class/:id/materials` (pick or view the book, chapters, sections, pages, PDF links) and `/teacher/class/:id/schedule` (setup form, chapter picker, "Build my calendar", fixes when short, save).
- `/teacher/class/:id/calendar` (`Calendar.tsx`): month and week grids on md+, a month list on phones (`SessionMonths`). Drag a class to another day (swaps if taken), or open it in a dialog to move it, cancel it, or remove a review day; + on an empty day adds a class (review / flexible, or "teach the next lesson", which pulls later classes up one); "Change class days" relays lessons from a date on. The edits are pure functions in `src/lib/calendarEdit.ts`: cancelling moves that lesson and later ones back one class day until a review / flexible day absorbs it, otherwise the calendar grows by a class day (and the end date moves). Every edit saves the whole list with `saveCalendar` (the database keeps past sessions) and shows an Undo bar. No new migration.
- Students: `/student/calendar` (nav "Calendar") and a "today and next" block on `/student` (`ViewerCalendar`, `NowCards`). The catch-up card on `/student/attendance` names the missed section from the calendar and links its pages; the 3-question check there is still sample. Parents: `/parent/calendar` (nav "Calendar") for their linked children (real data via `fetchChildCalendars`), and the same "today and next" block at the bottom of `/parent`. Parents can't read class names, so headings use the book title.
- PDF links: `usePdfLinks(book)` (signed for an hour), `sessionReading` (`src/lib/sessionLinks.ts`) opens a lesson at its section's first page and a chapter quiz at the chapter.

## Uploaded materials (PDF chapters, stages 1 to 3, done)

- Reading and chapters (browser only): `src/lib/materials/` (`readPdf`, `extract`, `cleanText`, `findChapters`, `chapterEdit`), editor `components/materials/ChapterEditor.tsx`. Test PDF: Conceptual Physics, chapters at PDF pages 7-36, 37-60, 61-70, 71-92, 93-110, 111-130, 131-160, 161-176 (all found exactly).
- Tables: `supabase/migrations/20261120000001_uploaded_materials.sql` (`materials`, `material_pages`, `material_chapters`; `create_material`, `save_material_chapters`, `delete_material` check ranges and ownership). Only the class's teacher reads page text and the original file; students and parents in the class can read the title and chapter names (for the calendar). It also closes a hole in the calendar migration's storage rule (a class id added as a "book" could read another class's uploads). Queries live in `src/lib/materialsDb.ts`.
- Storage: `course-materials/<class_id>/<material_id>/original.<pdf|md|txt>`, teacher only.
- Saving happens on `/teacher/quizzes` after "Check the chapters" (name, optional credit line, rights box). `/teacher/class/:id/materials` lists "Your files"; `/teacher/class/:id/materials/:materialId` (`Material.tsx`) shows chapters, "Re-check chapters" (rebuilt from saved page text, chapter ids kept), "Use for a quiz" (`/teacher/quizzes?material=…&chapter=…`), rename, delete (blocked while the calendar uses it) and "Add chapters to the calendar".
- Chapter quizzes (stage 3): migration `supabase/migrations/20261121000001_chapter_quizzes.sql` adds to `quiz_questions` `type` (`multiple_choice` or `numeric`; short written is left out until there is marking), `concept`, `source_pages`, `misconceptions` (per option, why a student might pick it; null for the right one), `answer_number`, `tolerance` (null means 1%), `unit`, `approved`; to `quizzes` `material_id`, `chapter_id`; to `quiz_responses` `value`. Drafts are `quizzes` rows with status `draft` (hidden from students and from `useClassData().quizzes`). `save_quiz_draft` checks pages are inside the chapter; `publish_quiz_draft` publishes only approved questions. It also replaces `quiz_for_student`, `submit_quiz` and `my_quizzes` (numeric marking, the source's credit line, only approved questions; misconception notes never reach students). Queries: `src/lib/chapterQuizDb.ts`.
- `generate-quiz` takes `{ chapter_id, options: { count, types, difficulty, exclude } }` and loads the chapter's text on the server (or the old `{ notes, topicId, … }`). Over 40,000 characters it splits on pages and asks per chunk in proportion, checks with zod (retry once), drops questions citing pages outside the chapter, removes near-duplicates. Provider from `LLM_PROVIDER` / `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY` (`llm.ts`), falling back to `GEMINI_API_KEY`.
- Screens: `/teacher/quizzes` takes a chapter number and a description (`QuizSettingsFields`: 5 to 20, multiple choice and number answers, difficulty), saves the draft after every change, and the review step (`QuestionFrame`) shows Approve, "From pages 41-43", the concept and the misconception notes. `?material=…&chapter=…` picks a chapter, `?draft=…` opens a draft; drafts are listed on the first step. The file page has "Make quizzes for all chapters" (one chapter at a time, "Try again" per chapter). Students type number answers in `QuizRunner` and see the credit line on the quiz page.
- Calendar: an uploaded file becomes a `Book` with id `upload-<material id>` (`src/lib/materials/asBook.ts`): chapter n has one section `n.1` with `ceil(pages / 6)` classes, plus a quiz day. `ensureUploadedBooks` registers it so `getBook()` works everywhere; `/teacher/class/:id/schedule?book=upload-…` builds from it. Page numbers are PDF pages (`Book.wholeFile`).

## Live quizzes (teacher-paced)

- Migration `supabase/migrations/20261122000001_live_quizzes.sql` (run last): `live_sessions` (status `lobby` → `open` → `revealed` → … → `ended`, one running session per class), `live_questions` (the session's own copy, so quick questions can be added mid-class; teacher-only because it holds answers), `live_answers` (one per student per question). Nobody writes tables directly: teacher functions `start_live_session`, `live_add_question`, `live_control` (`start` / `reveal` / `next` / `end`); student functions `live_state` (never returns the answer or the why before the reveal), `live_answer` (marks numeric answers within tolerance, 1% when null, like `submit_quiz`), `my_live_session` (the "Live now" banner). Realtime publication for `live_sessions` and `live_answers`.
- Queries and realtime: `src/lib/liveDb.ts` (`watchTables` for row changes, `watchPresence` for who is in the room). Hooks: `src/lib/useLive.ts` (`useLiveHost`, `useLiveState`, `useRunningSession`, `useLiveSessions`, `usePresence`). Every hook reloads on a realtime event, when the tab comes back into view, and on a timer (3 s for host and student screens, 8 s for lists and the banner), so a dropped connection never leaves a screen stale.
- Screens: `/teacher/live` (`pages/teacher/Live.tsx`: start from a published quiz or empty, running session, past sessions), `/teacher/live/:sessionId` (`LiveHost.tsx`: lobby with who is here, live counts per option, "Still thinking" names, Hide counts for projecting, summary after), `/student/live/:sessionId` (`pages/student/Live.tsx`: lobby, answer, wait, reveal with anonymous class counts, final review). `components/live/` has `LiveBits` (`OptionBars`, `StatusPill`, `Callout`), `AddQuestion` (dialog) and `format.ts`. `components/ui/Dialog.tsx` is the shared native dialog. `components/student/LiveNow.tsx` is the banner on student Home and Quizzes.
- No leaderboard and no speed points on purpose (students are never ranked against each other). No confidence tap in live mode. Live answers are not in `quiz_responses`, so Reports doesn't include them yet.

## Design system: "Sky canvas" (whole site)

Visual reference: ohhmydesign.com (match the look, never copy its text, images or code). A bright sky with slow clouds, white cards, dark navy cards for contrast, beige sticky notes, and design-tool touches: folder-tab frames, blue selection outlines with square handles, mono labels, ruler ticks. Every page is being moved to this system in stages (1 components and footer, 2 login/signup/role, 3 teacher, 4 student (done), 5 parent). The old `/app` workspace is retired and `/app/*` redirects to `/teacher`; the older "Warm Editorial Pedagogy" tokens (`primary`, `surface-*`, etc.) are still in `tailwind.config.js` but no page uses them for layout anymore. The old weekly family notes (`ParentUpdate.tsx`) are in git history (commit b2e7e9f) for Stage 5.

`/design` shows every component with sample data.

Backgrounds: the landing page uses the sky with clouds (`SkyBackground`). Every other page uses `PageShell`, which puts the content on `NotebookBackground`: blue paper with a notebook grid (fine 24px squares, a stronger line every 120px) and an orange margin line on wide screens.

Other pages so far:
- `/login` (`Login.tsx`): "welcome back" header, `login.frame` card. With Supabase on it is a real login, "Forgot password?" sends a reset email. Without keys it shows `NotConnectedNote` and doesn't log anyone in (same on `/signup`).
- `/signup` (`Signup.tsx`): "nice to meet you" header, `signup.frame` card with two steps: pick a role (`RoleCards`), then name, email, password. Teachers can name their class (Supabase on); students add a class code; parents add an invite code and a preferred language. Codes are checked before the account is made. `?role=teacher` starts on step 2. If email confirmation is on, it ends on a "Check your email" card.
- `/reset-password` (`ResetPassword.tsx`): where the reset email lands. Needs `/reset-password` in the Supabase redirect URLs.
- Areas (`components/area/AreaShell.tsx`): `/teacher`, `/student`, `/parent`. Desktop: a sidebar with a `teacher.area` style tab, the logo, the class name, the sections, and the person's name with "Log out" at the bottom. Phones and tablets: a top bar (logo, avatar, log out) and a bottom tab bar. Sections: teacher Home, Attendance, Quizzes, Reports, Class; student Home, Quizzes, My gaps, Attendance; parent Home, Progress, Messages, Settings. Every section is built. Home pages use `Bento` / `BentoItem` (`components/area/Bento.tsx`); empty states use `EmptyState` (one friendly line and one next action). `/app/*` redirects to `/login`.
- Teacher area (stage 2). Every page starts with `useClassGate()` (`components/area/classGate.tsx`) for loading, errors and "no class".
  - `/teacher` (`Home.tsx`): bento grid. Today's class (topic, attendance progress), a stat card for the last 5 school days, the latest quiz's top misconception (sample, as a `StatementCard`), and "Waiting for you" (sample review plans). Empty states when there are no students or quizzes.
  - `/teacher/attendance`: Present / Late / Absent per student, "Mark all present", today's topic (sample store), save through `useAttendance`. History is a table on md+ and a card per student on phones; flagged at twice or more.
  - `/teacher/quizzes`: three steps (Chapter, Questions, Review and publish). No topics, sample notes or paste box: the teacher picks the book (the class's uploaded materials, newest first; a select when there are several), types a chapter number (matched to the book's chapters in page order, with "See all chapters" to look them up) and optionally describes what to cover (`focus`, up to 600 characters, sent to the Edge Function with the chapter id). With no book yet it asks for the PDF first. "Upload another book (PDF)" stays available (.pdf, .md, .txt up to 50 MB, read in the browser with pdfjs-dist and split into chapters in `src/lib/materials/`, checked in `ChapterEditor` with the "I have the right to use this material with AI tools" box, then saved). The old notes path (`generateQuiz` / `publishQuiz` in `db.ts`, `QUIZ_TOPICS`) is no longer used by this page; the Edge Function still accepts it.
  - `/teacher/reports`: real quizzes with real finished counts and averages (`useQuizResults`), or an empty state plus a link to `/teacher/reports/sample`.
  - `/teacher/reports/:quizId`: real finished count and average, then the sample mix-ups (`useMisconceptions`): students, how many were sure but wrong, the questions, a "Why did Compass say this?" panel with each answer and a "This is wrong" toggle (it stops counting), and a navy 10-minute review plan beside each (`useReviewPlans`: Approve, Edit, Undo).
  - `/teacher/class`: class name, join code (copy code, copy an invite message), student list.
- Student area (stage 3), phone first. Pages start with `useClassGate({ student: true })`.
  - `/student` (`Home.tsx`): bento grid. Next quiz, retries due, a sticky note "You're getting better at" (sample), attendance this month (real), and `FamilyCard` ("Your parents see this same summary" plus the invite code with a copy button).
  - `/student/quizzes`: To do (by due date) and Finished. `/student/quiz/:quizId`: `QuizRunner` (`components/student/QuizRunner.tsx`): one question at a time, progress bar, big answers, then a Sure / Not sure / Guessed tap. Finish goes through `useClassData().finishQuiz`; confidence is saved with `useConfidence` (sample store). Finished quizzes open as `QuizResults`: score, right answer, their pick, how sure they were, and why.
  - `/student/gaps`: a statement card ("You're strong at…, keep working on…") and topic progress bars, then and now (`useTopicProgress`, sample, no rankings), `FamilyCard`, and retry quizzes. Retries are real missed questions (`useMistakes`, from finished quizzes) on a sample schedule (`useRetrySchedule`): back after 2 days, then 7, learned after two right in a row. `/student/retry` takes the due ones.
  - `/student/attendance`: a monthly calendar from the student's own attendance rows (`useMyAttendance`, real), month totals, and a catch-up card per missed day. `/student/check/:day` is a 3-question sample check (`useCatchUpCheck`); the day's topic comes from `useDayTopic` when this device has it.
- Parent area (stage 4), phone first and very simple. All sample for now (`db.ts` has no parent functions yet); every page shows `ParentSampleNote`. `ChildSwitcher` (`components/parent/`) picks the child (sample children Minji Kim and Joon Kim).
  - `/parent` (`Home.tsx`): bento grid. "This week" statement card, "One thing to ask tonight" sticky note, Doing well, Working on, and class this week (stat card).
  - `/parent/progress`: each topic as four weekly columns with plain words (the child against themselves, never other students), and recent quizzes in plain words.
  - `/parent/messages`: `ThreadCard` from the teacher with dividers 01 · This week, 02 · Working on, 03 · How you can help, and a reply box (replies kept on the device).
  - `/parent/settings`: preferred language (Korean, English, Russian, Mongolian, same list as sign-up) and "Link another child": the invite code is checked for real with `inviteCodeExists`, then waits to be linked (needs a `link_child` function).
- `/get-started` (`GetStarted.tsx`): the `RolePicker` with three `teacher.frame` / `student.frame` / `parent.frame` cards, each with three feature chips.

### Page structure

The landing page (`src/pages/Landing.tsx`) has only these parts, in order:

1. Sticky header: logo; "About", "Features", "Who it’s for"; "Log in" (goes to `/login`) and "Sign up" (scrolls to "Who are you?", or goes to `/get-started` from other pages).
2. Hero (`#about`): kinetic headline, intro in a dashed frame, "Get started" and "See how it works", a "scroll ↓" hint.
3. "Who are you?" (`#who-are-you`): three selectable role cards and a "Continue as a …" button to `/signup?role=…`. The same picker is the `/get-started` page.
4. Features (`#features`): five panels. Pinned with sideways scrolling on wide screens; a stacked list on mobile or with reduced motion.
5. Footer.

### Colors

| Token (Tailwind) | Hex | Use |
|---|---|---|
| `sky-top` → `sky-bottom` | `#5B9BE0` → `#C3DCF3` | Fixed vertical sky gradient behind the page, with drifting CSS clouds |
| `accent` | `#E8572A` | Orange: big feature numbers and other large text on white |
| `accent-soft` | `#FF8A5C` | Small orange text on navy (6.7:1), e.g. footer and stat card eyebrows |
| `accent-strong` | `#C9441A` | Orange for small text and button fills such as "Sign up" (white text on it is 4.9:1) |
| `navy` | `#161B26` | Body and heading text, "Continue as …" button, footer |
| `navy-soft` | `#4A5263` | Secondary text, on white or translucent white only (7.8:1 on white) |
| `card-line` | `#D6E6F7` | Pale blue border on white cards and pills |
| `select` | `#3B8BEA` | Frame outlines, handles, tab labels, selected-card check |
| `note` | `#F7E7CF` | Beige sticky notes |

Contrast rules:
- Headings and body text are navy. White text only on navy or orange backgrounds.
- `navy-soft` is too faint on the sky, so secondary text always sits on a white card.
- Smaller text that sits on the sky (intro paragraph, short lines, labels) gets a translucent white backing (`bg-white/80 backdrop-blur-sm`). Big navy headlines can sit directly on the sky (5.9:1 on the darkest blue).
- `accent` (#E8572A) is only 3.6:1 on white, so use it for large text (24px+ or 19px+ bold) and decoration. Small orange text and button fills use `accent-strong`.
- Frame tab labels are navy text on `select` blue (5:1). White on `select` is too faint for 11px text.
- Don't put orange text directly on the sky; it's too faint there. Orange goes on white cards, on a white pill, or (`accent-soft` for small text) on navy.

### Type

| Family (Tailwind) | Font | Use |
|---|---|---|
| `font-grotesk` | Inter Tight 800–900, tight tracking | Headlines, sentence case |
| `font-inter` | Inter | Body text, sentence case |
| `font-mono` | JetBrains Mono | Small labels: uppercase with wide tracking. Frame tab names stay lowercase (`lesson_01.intro`) |
| `font-hand` | Caveat | Handwriting inside sample cards only |

Pretendard is the Korean fallback in every stack.

### Components

Shared components live in `src/components/ui/`; landing-only pieces (`FeaturesScroller`, `RolePicker`) in `src/components/landing/`. Build new pages from these.

- `Frame`: card with a folder-style tab (`attendance.frame`, lowercase mono). Slides up and draws its blue selection outline once when it first scrolls into view; after that the outline shows on hover or keyboard focus. `selected` keeps it on; `tone="navy"` for a dark card; `tabEnd` puts something (on a white pill) at the right of the tab row.
- `Selection`: the outline and four square handles, used by `Frame` and `ShowcasePanel` (`tone="orange"`). CSS is `.ui-sel` in `index.css`.
- `SelectFrame`: the older floating-tab selection frame used in the landing hero ("about.txt") and feature panels.
- `SectionHeader`: orange script line (on a white pill so it stays readable on the sky), huge uppercase kinetic headline, optional `StickyNote`.
- `StickyNote`: beige note with tape, rotated (`tilt`).
- `StatementCard`: big orange quote mark, bold headline whose last line (`highlight`) is orange, grey body, mono footer row.
- `StatCard`: dark navy card, big white numbers, orange symbols, mono labels. Values must be computed from sample data (`attendanceStats()`, `quizStats()`).
- `Chip`: outlined pill with an icon; a toggle button (`selected`), a link (`to`), or a `static` tag.
- `Button`: `orange`, `navy`, `outline` or `soft`. A circle grows from the mouse on hover, slight squeeze on press.
- `ThreadCard`: chat card with header avatars, messages with times and file chips, orange mono dividers (`01 · THIS WEEK`), optional reply footer. `Avatar` is exported too.
- `Accordion`: frame-tab cards with orange `01` numbers and a plus that turns into a cross. Accessible button plus region.
- `ShowcasePanel` + `BrowserWindow`: white panel with an orange selection outline, number badge, title with an orange second line, text, and a browser mockup on the right.
- `SiteHeader`: sticky white header with rolling-label links. Collapses to logo, "Log in", "Sign up" and a menu button on mobile.
- `SiteFooter`: navy with rounded top, dot grid, `footer.frame` tab, orange mono eyebrow, contact line, three link columns with mono headings, ruler ticks, a huge "Compass" wordmark with an orange C, and a mono bottom bar.
- `Kinetic` + `Chars`: large headlines split into letters. Letters near the mouse rise into a smooth bump and tilt, then ease back. Use on every big headline. `intro` adds a letter-by-letter rise on load; `hoverColor` also turns letters near the mouse orange (hero only).
- `hover.tsx`: `RollLabel` (rolling label inside a `roll-host` link) and `fillHover` (circle fill on a `fill-host` element, used by `Button`).
- `SkyBackground`: fixed gradient plus clouds made from radial gradients (no blur filters).
- `PageShell` + `NotebookBackground`: layout for every page except the landing page.
- `Field`, `TextInput`, `PasswordInput`, `inputClass` (`Field.tsx`): labeled inputs with the error or hint right under the input, wired with `aria-invalid` and `aria-describedby`.
- `RoleCards` (in `landing/RolePicker.tsx`): the three role frames; `compact` for the sign-up step.
- `useInView`: true once an element scrolls into view; drives the `.reveal` slide-up on cards.
- White cards: `rounded-3xl border border-card-line bg-white shadow-card`.
- `CONTACT_EMAIL` in `src/lib/site.ts` is a placeholder (`hello@compass.example`) to replace before launch.

### Motion

- Lenis smooth scrolling (`src/lib/smoothScroll.ts`, synced to GSAP ScrollTrigger). Use `scrollToId()` for in-page links so the sticky header doesn't cover the target.
- GSAP + ScrollTrigger via `useGSAP` (`src/lib/motion.ts`). Animate only `transform` and `opacity`.
- Features pin only when `(min-width: 768px) and (prefers-reduced-motion: no-preference)`; the layout uses the matching `md:motion-safe:` Tailwind variants. Panels rest between slides so scrolling steps through them one at a time.
- Cards slide up when they scroll into view; frames draw their outline once on appear. Form steps switch with `.step-in` (220ms fade and 8px slide, ease-out-quart); focus moves to the new step's heading.
- The headline letter bump, the rolling labels, the circle fills and frame hover outlines run only with a real mouse (`(hover: hover) and (pointer: fine)`). Tailwind's `hoverOnlyWhenSupported` keeps every `hover:` style off touch screens. Buttons and chips squeeze slightly when pressed.
- Respect `prefers-reduced-motion`: no Lenis, no cloud drift, no slide-ups, frames appear already drawn, features as a normal list.
- Mobile: stack everything, no pinned sideways scrolling.

### Writing rules

- Never use em dashes (—) in site text. Use commas, periods, or colons.
- Write like a friendly person talking: short sentences, everyday words. No buzzwords such as "revolutionize", "seamless", "empower", or "unlock".
- No fake stats, metrics, client logos, or reviews. Illustrations use clearly sample data, labeled "Sample".
- Sentence case for body text and headlines; uppercase only for small mono labels.
