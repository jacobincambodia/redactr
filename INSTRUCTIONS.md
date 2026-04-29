# What to do after downloading

You should have a folder with this structure:

```
redactr/
├── README.md
├── CLAUDE.md
├── DESIGN.md
├── SPEC.md
├── INSTRUCTIONS.md       ← you are here
├── package.json
├── svelte.config.js
├── vite.config.js
├── .gitignore
├── src/
│   ├── routes/
│   │   ├── +layout.svelte
│   │   └── +page.svelte
│   ├── lib/
│   │   ├── redact.js
│   │   ├── tools.js
│   │   └── state.svelte.js
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── reset.css
│   │   └── app.css
│   └── app.html
└── static/
    └── (favicons go here)
```

## Step 1 — Install dependencies

```bash
cd redactr
npm install
```

This installs SvelteKit, the static adapter, and Vite. That's it. No other runtime dependencies.

## Step 2 — Verify the dev server starts

```bash
npm run dev
```

You should see `Local: http://localhost:5173`. Open it. Right now you'll see a stub page — the components are placeholders. That's expected.

## Step 3 — Hand off to Claude Code

```bash
claude
```

When Claude Code opens, paste this:

> Read CLAUDE.md, DESIGN.md, and SPEC.md in that order. Then implement v1. Start with the design tokens in src/styles/tokens.css, then the empty-state UI in +page.svelte, then add image loading (paste, drop, file picker), then the canvas and toolbar, then the three redaction tools (black box, pixelate, blur) with the algorithms specified in SPEC.md, then the three markup tools (rect, arrow, text), then the export flow. Show me the code as you go and ask before pulling in any new dependencies.

That gives Claude Code a clear order of work and the context to do it well.

## Step 4 — Initialize git and push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: docs and scaffold"
gh repo create redactr --public --source=. --remote=origin
git push -u origin main
```

(If you don't have the `gh` CLI: create the repo on github.com manually, then `git remote add origin ...` and `git push`.)

## Step 5 — Connect to Vercel

```bash
npx vercel
```

Or:
1. Go to vercel.com → Add New → Project
2. Select your `redactr` repo
3. Vercel detects SvelteKit automatically. Build command: `npm run build`. Output directory: `build`. (These should auto-fill.)
4. Deploy

You'll get a `redactr-xxx.vercel.app` URL. After your domain is purchased, add it under Project Settings → Domains.

## Step 6 — Buy redactr.app

[Namecheap](https://www.namecheap.com/) or [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) are both fine. Cloudflare sells at cost — no markup — which is the cheapest long-term option.

After purchase, add the domain to your Vercel project under Project Settings → Domains. Vercel gives you the DNS records to set at your registrar. HTTPS is automatic.

## Step 7 — Iterate

Use the tool yourself for a week. Note every bit of friction. Then come back with that list and we'll work through v2.

---

## A note on working with Claude Code

A few things that will save time:

- **CLAUDE.md is loaded automatically** when you start a Claude Code session in this directory. You don't need to paste it. The instruction in step 3 just makes sure Claude reads SPEC and DESIGN too.
- **Reference SPEC.md and DESIGN.md by name** when you want Claude to recheck a decision: "Does this match what's in DESIGN.md?"
- **If Claude wants to add a dependency**, push back. CLAUDE.md says no by default. Make it justify each one.
- **Commit often.** Small commits are easier to revert than big ones. After each major chunk (empty state, then loading, then canvas, etc.) commit.
