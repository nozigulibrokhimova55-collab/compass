# Compass

Front-end demo (Vite, React, TypeScript, Tailwind 3, React Router) for high school science classes. Sample data for the redesigned pages lives in `src/lib/sample.ts` (Ms. Park's class, Minji Kim); older app pages use `src/lib/data.ts`. Tokens live in `tailwind.config.js`; global CSS in `src/index.css`.

## Design system: "Sky canvas" (whole site)

Visual reference: ohhmydesign.com (match the look, never copy its text, images or code). A bright sky with slow clouds, white cards, dark navy cards for contrast, beige sticky notes, and design-tool touches: folder-tab frames, blue selection outlines with square handles, mono labels, ruler ticks. Every page is being moved to this system in stages (1 components and footer, 2 login/signup/role, 3 teacher, 4 student, 5 parent). Pages under `/app` still use the older "Warm Editorial Pedagogy" tokens (`primary`, `surface-*`, etc.) until they are replaced.

`/design` shows every component with sample data.

Backgrounds: the landing page uses the sky with clouds (`SkyBackground`). Every other page uses `PageShell`, which puts the content on `NotebookBackground`: blue paper with a notebook grid (fine 24px squares, a stronger line every 120px) and an orange margin line on wide screens.

Other pages so far:
- `/login` (`Login.tsx`): "welcome back" header, `login.frame` card. Demo only, signs in as a teacher.
- `/signup` (`Signup.tsx`): "nice to meet you" header, `signup.frame` card with two steps: pick a role (`RoleCards`), then name, email, password. Students add a class code; parents add an invite code and a preferred language. `?role=teacher` starts on step 2.
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
