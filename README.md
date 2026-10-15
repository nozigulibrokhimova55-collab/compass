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
2. In the dashboard, open **SQL Editor**, paste all of `supabase/schema.sql`, and run it. It is safe to run again, and you should run it again after updating the app, since new features add tables and functions.
3. Open **Project Settings > API**. Copy `.env.example` to `.env.local` and fill in the project URL and the anon (publishable) key. Never use the `service_role` key here.
4. Open **Authentication > URL Configuration**. Set the Site URL to where the app runs (`http://localhost:5173` while developing). Under Redirect URLs, add `/login` and `/reset-password` on that same address. Do the same for your live address when you deploy.
5. Optional: under **Authentication > Providers > Email**, turn off **Confirm email** while testing. When it is on, new people see "Check your email" after signing up and must click the link before logging in.
6. Restart `npm run dev` so it picks up `.env.local`.

## What is live and what is still sample

| Live with Supabase | Still sample data |
|---|---|
| Sign up, log in, log out, "keep me signed in", password reset | Misconception card, lesson ideas |
| Teacher gets a class and a join code at sign-up | Quiz questions (picked from a small sample set, not generated) |
| Students join with the class code, parents link with the student's invite code | Parent page (placeholder for now) |
| Teacher roster, attendance (today plus the last 5 school days), saved quizzes | |
| Students take quizzes (one attempt), see answers and reasons afterwards, and teachers see the scores | |

"Open the demo" on the login page still works with Supabase on. It opens the sample class as Ms. Park and never touches the database.

## How it is put together

- `src/lib/supabase.ts`: the client. `isSupabaseConfigured` is false when the keys are missing.
- `src/lib/db.ts`: every database query. Pages never call Supabase directly.
- `src/lib/session.tsx`: who is signed in (`useSession`), plus `logIn`, `signUp`, `signOut`, `sendReset`, `updatePassword`. `isDemo` is true for the sample class.
- `src/lib/classData.tsx`: the signed-in person's class, roster, and quizzes (`useClassData`).
- `src/lib/useAttendance.ts`: today's marks and the recent days.
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
