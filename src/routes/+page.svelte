<script>
  // This is a stub. Claude Code will implement the full editor here per SPEC.md and DESIGN.md.
  //
  // Order of work:
  //   1. Empty state (no image loaded) — see DESIGN.md "Empty state"
  //   2. Image loading (paste, drop, file picker) — see SPEC.md "Loading images"
  //   3. Canvas rendering with dot-grid surface
  //   4. Toolbar pill + settings strip — see DESIGN.md "Toolbar pill"
  //   5. Three redaction tools: black box, pixelate, blur — see SPEC.md "Algorithms"
  //   6. Three markup tools: rectangle, arrow, text
  //   7. Undo, clear, export — see SPEC.md "Actions"
  //   8. Theme toggle with localStorage persistence
  //
  // Until then, this just renders a placeholder so the dev server is verifiable.
</script>

<main style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: var(--space-5);">
  <div style="text-align: center; max-width: 320px;">
    <div style="font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-tertiary); margin-bottom: var(--space-3);">
      Scaffold ready
    </div>
    <h1 style="font-size: 22px; font-weight: 500; letter-spacing: -0.01em; margin-bottom: var(--space-3);">
      Redactr
    </h1>
    <p style="font-size: 14px; color: var(--ink-secondary); line-height: 1.5;">
      Run <code class="mono">claude</code> in this directory and ask it to read CLAUDE.md, DESIGN.md, and SPEC.md, then implement v1.
    </p>
  </div>
</main>

<style>
  code {
    background: var(--border-hairline);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 13px;
  }
</style>
