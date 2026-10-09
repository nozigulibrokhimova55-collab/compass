# Compass

Compass is a diagnostic learning platform for high school science. It is built from the Stitch "Warm Editorial Pedagogy" design export.

**Stack:** Vite, React 19, TypeScript, Tailwind CSS 3 and React Router.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Routes

| Path | Screen |
| --- | --- |
| `/` | Marketing landing page, with an EN / 한국어 hero toggle |
| `/login`, `/signup` | Log in and role-based sign up (teacher / student / parent) |
| `/app` | Educator Cockpit (teacher dashboard) |
| `/app/radar` | Misconception Radar (the header search lands here) |
| `/app/reflections` | Student Reflections |
| `/app/family` | Parent weekly update, with an EN / 한국어 toggle |
| `/app/curriculum` | Curriculum Map |

This is a front-end demo. All data is sample data in `src/lib/data.ts`. Signing in only stores a local session. If nobody is signed in, the workspace falls back to the sample educator, so every screen can still be viewed.

Design tokens such as colors, type scale, spacing and elevation are in `tailwind.config.js`.
