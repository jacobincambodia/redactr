# Redactr

A browser-based image redaction and markup tool. Black box, pixelate, blur, plus arrows, text, and shapes. Everything runs locally — no upload, no account, no tracking.

**Live:** [redactr.app][1]

## What it does

- Black-box, pixelate, or blur any region of an image
- Add markup: rectangles, arrows, text labels
- Strong defaults: redaction strength scales with the region, double-pass blur, irreversible export
- Mobile-first: works on phone, tablet, desktop
- Strips metadata (including GPS) on export

## Stack

- SvelteKit (static adapter)
- Vanilla CSS with CSS custom properties
- Canvas API for image manipulation
- No analytics, no tracking, no external dependencies at runtime

## Quick start

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`.

## Build

```bash
npm run build
npm run preview
```

Output goes to `build/`. Static files, deploys to anything.

## Deploy

Connect the GitHub repo to Vercel. The `@sveltejs/adapter-static` is preconfigured. Vercel will detect SvelteKit and build automatically. No environment variables needed.

For Netlify or Cloudflare Pages, the same `build/` directory works as the publish target.

## Working with Claude Code

This repo is designed to be developed with [Claude Code][2]. The relevant context lives in:

- `CLAUDE.md` — instructions for Claude Code (read this first)
- `SPEC.md` — feature spec, v1 scope, deferred features, algorithms
- `DESIGN.md` — visual spec, design tokens, components, behaviors
- `INSTRUCTIONS.md` — what to do after cloning

Open the project in Claude Code and say:

> Read CLAUDE.md, SPEC.md, and DESIGN.md. Then implement v1.

## License

MIT. Use it, fork it, build on it.

[1]:	https://redactr.app
[2]:	https://claude.com/claude-code