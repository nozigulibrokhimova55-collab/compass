# Compass

A web app for high school science classes. It finds the misunderstanding behind wrong quiz answers and shows teachers, students, and parents what to do next.

Built with Vite, React, TypeScript, Tailwind CSS, and React Router.

```bash
npm install
npm run dev
npm run build
```

## Features

- **Landing page** (`/`): what Compass does, with an English/Korean switch.
- **Log in and sign up** (`/login`, `/signup`): sign up as a teacher, student, or parent. Each role asks for different details.
- **Dashboard** (`/app`): the main misconception for each class, a review plan you can edit and approve, and a list of items waiting for approval.
- **Misconception Radar** (`/app/radar`): common wrong ideas by class, with search and a suggested fix for each.
- **Reflections** (`/app/reflections`): students' written answers. Teachers can reply.
- **Family updates** (`/app/family`): a weekly note for parents in English or Korean, with a question to ask at home.
- **Curriculum Map** (`/app/curriculum`): progress by unit and topic.

## Notes

This is a front-end demo. Sample data is in `src/lib/data.ts`, and signing in only saves a session in the browser. Colors, fonts, and spacing are set in `tailwind.config.js`.
