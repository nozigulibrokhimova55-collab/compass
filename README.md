# Compass

A web app for high school science classes. It finds the misunderstanding behind wrong quiz answers and shows teachers, students, and parents what to do next.

Built with Vite, React, TypeScript, Tailwind CSS, React Router, and Supabase.

```bash
npm install
npm run dev
npm run build
```

With no Supabase keys, Compass runs as a demo: sample data, nothing saved to a server. With keys, people sign up for real and their class, attendance, and quizzes are saved to your Supabase project.

## Turn on Supabase

1. Make a project at [supabase.com](https://supabase.com).
2. In the dashboard, open **SQL Editor**, paste all of `supabase/schema.sql`, and run it. It is safe to run again, and you should run it again after updating the app, since new features add tables and functions. Then run each file in `supabase/migrations/` the same way, oldest first: `20261106000001_syllabus_calendar.sql` (the class calendar), `20261120000001_uploaded_materials.sql` (uploaded PDFs and their chapters), then `20261121000001_chapter_quizzes.sql` (chapter quizzes and number answers), then `20261122000001_live_quizzes.sql` (live quizzes, run it last). All are safe to run again. If you rerun `schema.sql`, rerun the migrations after it: the last one replaces two of its quiz functions.
3. Open **Project Settings > API**. Copy `.env.example` to `.env.local` and fill in the project URL and the anon (publishable) key. Never use the `service_role` key here.
4. Open **Authentication > URL Configuration**. Set the Site URL to where the app runs (`http://localhost:5173` while developing). Under Redirect URLs, add `/login` and `/reset-password` on that same address. Do the same for your live address when you deploy.
5. Optional: under **Authentication > Providers > Email**, turn off **Confirm email** while testing. When it is on, new people see "Check your email" after signing up and must click the link before logging in.
6. Restart `npm run dev` so it picks up `.env.local`.

## Turn on AI quiz questions (Gemini)

The teacher's "Make questions" button asks an AI model to write questions from the lesson notes or from a chapter of an uploaded book. The call goes through a Supabase Edge Function, so the key stays on the server and never reaches the browser. Only the notes or the chapter's text go to the model, never names or emails. Without this step, teachers see an error when they press "Make questions".

1. Get a key at [aistudio.google.com](https://aistudio.google.com) (Get API key).
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and log in: `supabase login`, then `supabase link --project-ref YOUR_PROJECT_REF` (the ref is in your project URL).
3. Pick the provider with secrets, then deploy the function:
   ```bash
   supabase secrets set LLM_PROVIDER=gemini LLM_API_KEY=your-key LLM_MODEL=the-model-id
   supabase functions deploy generate-quiz
   ```
   `LLM_PROVIDER` is `gemini` (Google's API) or `openai` (any OpenAI-compatible chat completions API; set `LLM_BASE_URL` for one that isn't api.openai.com). The older setup, `GEMINI_API_KEY` with an optional `GEMINI_MODEL`, still works on its own.
4. The function reads `deno.json` in its folder for zod (the check on every question). `supabase functions deploy` picks it up.

Only signed-in teachers can call it. It checks every answer the model sends back (4 different options, one right answer in range, a reason) and drops any question that fails. Teachers still review every question before publishing. Their notes are sent to Google to write the questions, and the page says so.

## Live quizzes

A teacher runs a quiz for the whole class at once. Students answer on their phones, the teacher sees answers come in, and shows the answer when ready.

- Teacher: **Live** in the sidebar (`/teacher/live`). Pick a published quiz and press **Go live**, or **Start with quick questions** to begin empty. The host screen (`/teacher/live/:id`) has Start, Show the answer, Next question, Add a question (pick an answer or type a number) and End quiz.
- Student: a **Live now** card appears on Home and Quizzes while a session is running. It opens `/student/live/:id`.
- No leaderboard. A student sees only their own result, plus how many in the class picked each option (no names) once the answer is shown. The teacher sees names on their own screen.
- Needs `supabase/migrations/20261122000001_live_quizzes.sql`. It also adds `live_sessions` and `live_answers` to the `supabase_realtime` publication, so updates arrive instantly. If realtime is off, the screens still refresh every few seconds.
- Live answers are kept separate from regular quiz responses, so they don't show up in Reports yet.

## What is live and what is still sample

| Live with Supabase | Still sample data |
|---|---|
| Sign up, log in, log out, "keep me signed in", password reset | Misconception card, lesson ideas |
| Teacher gets a class and a join code at sign-up | Quiz questions in the demo (picked from a small sample set) |
| Students join with the class code, parents link with the student's invite code | Parent page (placeholder for now) |
| Teacher roster, attendance (today plus the last 5 school days), saved quizzes | |
| Quiz questions written by Gemini from the teacher's notes |
| Students take quizzes (one attempt), see answers and reasons afterwards, and teachers see the scores | |

"Open the demo" on the login page still works with Supabase on. It opens the sample class as Ms. Park and never touches the database.

## How it is put together

- `src/lib/supabase.ts`: the client. `isSupabaseConfigured` is false when the keys are missing.
- `src/lib/db.ts`: every database query, plus `generateQuiz` for the Gemini function. Pages never call Supabase directly.
- `src/lib/session.tsx`: who is signed in (`useSession`), plus `logIn`, `signUp`, `signOut`, `sendReset`, `updatePassword`. `isDemo` is true for the sample class.
- `src/lib/classData.tsx`: the signed-in person's class, roster, and quizzes (`useClassData`).
- `src/lib/useAttendance.ts`: today's marks and the recent days.
- `supabase/functions/generate-quiz/`: the Edge Function (`index.ts`), the model call for either provider (`llm.ts`), chapter quizzes (`chapter.ts`: chunks, prompt, zod checks, near-duplicates) and the notes checks (`validate.ts`).
- `supabase/schema.sql`: tables, the sign-up trigger, and row level security. Teachers only see their own classes, students only their own class, parents only their child. Students can't read quiz answers until they finish a quiz.
- `src/App.tsx`: with Supabase on, `/teacher`, `/student`, and `/parent` need a login, and each person can only open their own area.

Sign-up sends the name, role, language, and the class name, class code, or invite code to Supabase as metadata. The `handle_new_user` trigger in `schema.sql` turns that into a profile, plus a class (teachers), a class membership (students), or a parent link (parents).

## Pages

- `/`: landing page, with an English/Korean switch.
- `/login`, `/signup`, `/reset-password`: sign up as a teacher, student, or parent. Each role asks for different details.
- `/teacher`: overview, `/teacher/attendance`, `/teacher/quizzes`.
- `/student`: quiz list, `/student/quiz/:id` to take or review one.
- `/parent`: placeholder until that area is built.
- `/design`: every shared component with sample data.

## Notes

Colors, fonts, and spacing are set in `tailwind.config.js`. Sample data is in `src/lib/sample.ts`. See `CLAUDE.md` for the design system and writing rules.
