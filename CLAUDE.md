# Working in this repo

You are working on Redactr, a browser-based image redaction tool. This file gives you the context and constraints you need to do good work here. Read it first.

## What Redactr is

A web app that lets a user paste, drop, or select an image, draw redaction or markup over it, and export the result as a flattened PNG. All processing is local — the image never leaves the browser. Mobile-first, deployable to Vercel as a static site.

The user is Jacob, an investigative journalist based in Cambodia covering organized crime, scam compounds, and financial crime in Southeast Asia. He uses this tool to redact sensitive information from screenshots before publishing on X or in stories. The threat model is real: leaked source identities, exposed location data, reversible blur revealing redacted faces. Strong defaults matter.

## How to work with Jacob

- He prefers direct, unvarnished feedback. If a request will produce a worse result, say so.
- He pushes back when responses feel sycophantic or over-formatted. Match his register.
- He is candid that his technical work is AI-assisted. Don't over-explain basics he already knows.
- His genuine edge is editorial judgment and field presence, not implementation. Your job is to handle implementation well so he can focus on the editorial parts.
- Don't add features outside the spec without checking. v1 scope is deliberately tight.
- When making non-obvious decisions, surface them briefly rather than burying them in commits.

## Architectural constraints (non-negotiable)

1. **Everything runs in the browser.** No server-side image processing. No backend. No API. The Canvas API does all image manipulation.
2. **No tracking, no analytics, no third-party scripts.** This is part of the product's promise. Don't add Google Analytics, Plausible, Sentry, or anything that makes a network request to a third party at runtime. The site can be self-hosted from a static folder with no outside dependencies.
3. **No accounts, no auth, no cloud sync.** Ever.
4. **No external image processing libraries.** Use the Canvas 2D API directly. No fabric.js, no konva, no paper.js, no tldraw. The whole point of this tool is being small, fast, auditable, and dependency-free.
5. **Strip metadata on export.** Re-encoding through canvas does this for free, but the export path must always go through canvas re-encode, never copy the original file's bytes.
6. **Redaction must be irreversible in the exported file.** Pixelate samples from the original, blur double-applies, black box overwrites pixels. The exported PNG must contain only the final composited image — no layer data, no metadata, no original pixels under masks.
7. **Touch-first.** Every interaction must work on a phone with one thumb. Mouse and trackpad come second.
8. **Static site.** No server-side rendering, no edge functions. SvelteKit with `adapter-static`. The output of `npm run build` is a folder of static files.

## Technology choices

- **SvelteKit** with the static adapter. Chosen because it's not the AI-default Next.js stack, has minimal bundle size, and compiles to static files cleanly.
- **Vanilla CSS** with CSS custom properties. No Tailwind, no shadcn, no UI library. The design language is specific (see DESIGN.md) and benefits from explicit, hand-written CSS.
- **No TypeScript** for v1. Plain JavaScript with JSDoc comments where types help. We can add TS in v2 if it earns its keep.
- **Lucide icons** as Svelte components, individually imported. Or write SVGs inline if a single icon is enough.

If you find yourself reaching for a dependency, ask first. The default answer is no.

## Code style

- **Two spaces for indentation.** Single quotes for strings.
- **No semicolons in Svelte component scripts** unless they prevent ASI bugs. Use semicolons in `.js` files in `src/lib/`.
- **Functions over classes.** Pure functions for canvas operations. State lives in Svelte stores or component-local `$state`.
- **No premature abstraction.** Inline a function until it's used in three places, then extract.
- **Comments explain *why*, not *what*.** If a piece of code is non-obvious, leave a one-line comment about the reason. Skip "// loop through items" type comments.
- **Keep functions short.** If a function exceeds 40 lines, look for a natural split.

## File and folder conventions

```
src/
  routes/
    +page.svelte          Main editor page (single-route app)
    +layout.svelte        Shared shell, theme handling
  lib/
    redact.js             Canvas operations: pixelate, blur, blackbox, export
    tools.js              Tool definitions and metadata
    state.svelte.js       Shared state via Svelte 5 runes
    keyboard.js           Keyboard shortcut handler
  styles/
    tokens.css            Design tokens (CSS custom properties)
    reset.css             Modern CSS reset
    app.css               Global styles, imports tokens.css and reset.css
static/
  favicon.svg
  apple-touch-icon.png
  manifest.json
```

Components stay in `+page.svelte` until they exceed ~150 lines, then extract to `src/lib/components/`. Don't create the components folder preemptively.

## Visual design

The full visual spec is in `DESIGN.md`. Brief version:

- **Light mode:** warm cream background (`#f5f3ee`) with a subtle dot grid pattern (16px spacing, 8% opacity dots). Recessed canvas surface, image sits on top with a soft shadow.
- **Dark mode:** near-black background (`#0d0d0d`) with same dot grid at 6% opacity (in white).
- **Default mode:** match system preference via `prefers-color-scheme`. Manual toggle available.
- **Toolbar:** floating pill at bottom-center, frosted white (light) or frosted near-black (dark), 0.5px hairline border, three groups separated by thin dividers.
- **Active tool state:** filled black (light) or filled white (dark) background behind the icon, icon color flips. No accent color on chrome.
- **Type:** sans for UI, monospace for any number (block size, blur radius, dimensions, file size).
- **Sentence case** everywhere. No Title Case, no ALL CAPS labels except in tiny meta-text where letterspacing carries it.
- **No emoji.** No gradients on UI chrome (gradients only on placeholder image stand-ins). No drop shadows except the canvas image shadow.
- **Two font weights only:** 400 regular, 500 medium. No 600 or 700.
- **Border radius:** 6-8px on small elements, 10-14px on toolbar pills, 12px on the canvas surface.

## Behavior expectations

- **Pixelate slider** must update the active tool's settings *during* draw, not after. If the user changes block size mid-drag, the preview updates live. The bug in the prototype was that React's stale closures captured the slider value at draw-start; in Svelte with runes this is naturally avoided, but verify it works.
- **Blur** applies twice for irreversibility. The slider sets the radius for each pass.
- **Black box** is the recommended default. Make it visually prominent in the toolbar (selected by default on first load).
- **Drawing** uses pointer events (`pointerdown`, `pointermove`, `pointerup`), not separate mouse and touch handlers. `touch-action: none` on the canvas to prevent scroll/zoom while drawing.
- **Undo** is single-level — undo last action only. v2 adds full history.
- **Export** is a click on a clear export button. Filename is `<original>-redacted.png`.
- **Metadata stripping** happens automatically because we re-encode through canvas. Verify in code review that we never `URL.createObjectURL` the original file for the export path.

## What not to do

- Don't add a settings page, account system, or "save to cloud" feature.
- Don't add file upload to a server, even temporarily.
- Don't add an image library that pulls in 200KB of code. Canvas 2D is enough.
- Don't add a marketing landing page in front of the editor. The editor IS the landing page.
- Don't add a tutorial overlay. The tool should be self-explanatory.
- Don't add cookies or localStorage tracking of anything user-identifying. Theme preference in localStorage is fine.
- Don't introduce a build step that requires Node 20+ or anything exotic. Stay on whatever the current LTS is.
- Don't ship code that loads remote fonts. System fonts only.

## When in doubt

The product's promise is **fast, private, strong**. If a decision conflicts with one of those three, default to the one that protects the promise. If a feature would help one user but compromise privacy for everyone, cut the feature.

If you're unsure whether to add something, write a short justification first. If the justification feels weak, don't add it.
