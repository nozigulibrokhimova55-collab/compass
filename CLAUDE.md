# Compass

Front-end demo (Vite, React, TypeScript, Tailwind 3, React Router) for high school science classes. Sample data lives in `src/lib/data.ts`. Tokens live in `tailwind.config.js`; global CSS in `src/index.css`.

## Design system: "Sky canvas" (landing page)

The landing page is calm and clear: a bright sky with slow clouds, white cards, and a few design-tool touches (blue "selected" frames with square handles and mono tab labels). The app pages under `/app` still use the older "Warm Editorial Pedagogy" tokens (`primary`, `surface-*`, etc.) until they are restyled.

### Page structure

The landing page (`src/pages/Landing.tsx`) has only these parts, in order:

1. Sticky header: logo; "About", "Features", "Who it's for"; "Log in" and "Sign up" (both scroll to "Who are you?", or go to `/get-started` from other pages).
2. Hero (`#about`): kinetic headline, intro in a dashed frame, "Get started" and "See how it works", a "scroll ↓" hint.
3. "Who are you?" (`#who-are-you`): three selectable role cards and a "Continue as a …" button to `/signup?role=…`. The same picker is the `/get-started` page.
4. Features (`#features`): five panels. Pinned with sideways scrolling on wide screens; a stacked list on mobile or with reduced motion.
5. Footer.

### Colors

| Token (Tailwind) | Hex | Use |
|---|---|---|
| `sky-top` → `sky-bottom` | `#5B9BE0` → `#C3DCF3` | Fixed vertical sky gradient behind the page, with drifting CSS clouds |
| `accent` | `#E8572A` | Orange: big feature numbers and other large text on white |
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
- Don't put orange text directly on the sky; it's too faint there. Orange goes on white cards.

### Type

| Family (Tailwind) | Font | Use |
|---|---|---|
| `font-grotesk` | Inter Tight 800–900, tight tracking | Headlines, sentence case |
| `font-inter` | Inter | Body text, sentence case |
| `font-mono` | JetBrains Mono | Small labels: uppercase with wide tracking. Frame tab names stay lowercase (`lesson_01.intro`) |
| `font-hand` | Caveat | Handwriting inside sample cards only |

Pretendard is the Korean fallback in every stack.

### Components (`src/components/landing/`)

- `SiteHeader`: sticky white header. Collapses to logo, "Log in", "Sign up" and a menu button on mobile.
- `Frame`: the "selected" frame. Thin blue outline, white square corner handles, optional tab label (top-left or bottom-right), optional dashed outline. The outline draws itself the first time it scrolls into view; `show={false}` hides it (used for the role cards, which show it when picked).
- `RolePicker`: the "Who are you?" heading, role cards and continue button.
- `FeaturesScroller`: the five feature panels and a "1 of 5" indicator. Each panel is a design-file window: a top bar with window dots and a file name (`01_quiz_draft.fig`), a dotted canvas, and the sample card (labeled "Sample") selected in a `Frame` with a `… · selected` tab at the bottom right and an orange check badge showing "Made for".
- `SiteFooter`: navy, rounded top corners, faint dot grid.
- `Kinetic` + `Chars` (`Kinetic.tsx`): large headlines split into letters. Letters near the mouse rise into a smooth bump (about a quarter of the letter height, fading over about three letters each side) and tilt along it, then ease back. Use on every big headline (h1, h2, feature titles). `intro` adds a letter-by-letter rise on load (hero only).
- Button hovers (`hover.tsx`): header links ("About", "Features", "Who it's for", "Log in") get a pale pill and a rolling label (`RollLabel` inside a `roll-host` link). "Sign up" is orange text that fills into an orange button while its label rolls. Big buttons ("Get started", "See how it works", "Continue as …") use `fillHover` on a `fill-host` element: a circle of `--fill` grows from where the mouse enters and shrinks toward where it leaves.
- `SkyBackground`: fixed gradient plus clouds made from radial gradients (no blur filters).
- White cards: `rounded-3xl border border-card-line bg-white shadow-card`.
- `CONTACT_EMAIL` in `src/lib/site.ts` is a placeholder (`hello@compass.example`) to replace before launch.

### Motion

- Lenis smooth scrolling (`src/lib/smoothScroll.ts`, synced to GSAP ScrollTrigger). Use `scrollToId()` for in-page links so the sticky header doesn't cover the target.
- GSAP + ScrollTrigger via `useGSAP` (`src/lib/motion.ts`). Animate only `transform` and `opacity`.
- Features pin only when `(min-width: 768px) and (prefers-reduced-motion: no-preference)`; the layout uses the matching `md:motion-safe:` Tailwind variants. Panels rest between slides so scrolling steps through them one at a time.
- The headline letter bump (letters near the mouse also turn orange on the hero headline), the rolling labels and the circle fills run only with a real mouse (`(hover: hover) and (pointer: fine)`). Touch screens skip them.
- Respect `prefers-reduced-motion`: no Lenis, no cloud drift, frames appear already drawn, features as a normal list.
- Mobile: stack everything, no pinned sideways scrolling.

### Writing rules

- Never use em dashes (—) in site text. Use commas, periods, or colons.
- Write like a friendly person talking: short sentences, everyday words. No buzzwords such as "revolutionize", "seamless", "empower", or "unlock".
- No fake stats, metrics, client logos, or reviews. Illustrations use clearly sample data, labeled "Sample".
- Sentence case for body text and headlines; uppercase only for small mono labels.
