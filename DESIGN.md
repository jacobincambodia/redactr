# Design specification

This document defines the visual language of Redactr. Everything is precise enough that an implementer doesn't have to guess. Where it leaves room for judgment, that's intentional — note it and pick well.

The reference for the overall feel is **CleanShot X** (the macOS screenshot tool) adapted for the web. Floating toolbars, neutral surfaces, no accent color on chrome, monospace numerics, generous space around the canvas.

---

## Design principles

1. **The image dominates.** Everything else is chrome. Chrome stays out of the way.
2. **Quiet selection states.** Active states use fill, not color. Color is reserved for the user's markup on the canvas.
3. **Numerics are mono.** Any number a user reads (block size, blur radius, file dimensions, file size) is in monospace. This makes the tool feel like a *tool*.
4. **Touch targets are 36px minimum, 44px on the bottom toolbar.** Thumb-friendly.
5. **Hairlines, not heavy borders.** All UI borders are 0.5px or 1px max.
6. **No surprises in motion.** Transitions are short (100-150ms) and only on color/background changes. No bouncy springs, no slide-ins, no fades on appearance.

---

## Color tokens

CSS custom properties, defined on `:root` and overridden in a `[data-theme="dark"]` block. The mode toggle sets `data-theme` on `<html>`. System preference is the default via `@media (prefers-color-scheme: dark)`.

### Light (default)

```css
--surface-page: #f5f3ee;          /* warm cream — outermost background */
--surface-canvas: #ebe8e1;        /* slightly darker — recessed canvas area */
--surface-dot: rgba(0, 0, 0, 0.08); /* dot grid color on surface-canvas */
--surface-elevated: #ffffff;       /* toolbar pills, drawer */
--surface-elevated-glass: rgba(255, 255, 255, 0.96); /* with backdrop-filter blur(20px) */

--ink-primary: #1a1a1a;           /* primary text and active fills */
--ink-secondary: #666666;         /* secondary text */
--ink-tertiary: #888888;          /* tertiary text, meta labels */
--ink-disabled: #b8b8b8;

--ink-inverse: #ffffff;           /* text on ink-primary fills */

--border-hairline: rgba(0, 0, 0, 0.08);
--border-emphasis: rgba(0, 0, 0, 0.16);

--accent-canvas-selection: #2563eb; /* ONLY for the selection rectangle on the canvas, never on chrome */

--shadow-canvas: 0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 32px rgba(0, 0, 0, 0.08);
--shadow-toolbar: 0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.12);
```

### Dark

```css
--surface-page: #0d0d0d;
--surface-canvas: #0a0a0a;
--surface-dot: rgba(255, 255, 255, 0.06);
--surface-elevated: #181818;
--surface-elevated-glass: rgba(24, 24, 24, 0.96);

--ink-primary: #ffffff;
--ink-secondary: #999999;
--ink-tertiary: #666666;
--ink-disabled: #444444;

--ink-inverse: #1a1a1a;

--border-hairline: rgba(255, 255, 255, 0.08);
--border-emphasis: rgba(255, 255, 255, 0.16);

--accent-canvas-selection: #3b82f6; /* slightly lighter blue for dark mode */

--shadow-canvas: 0 1px 2px rgba(0, 0, 0, 0.4), 0 12px 32px rgba(0, 0, 0, 0.6);
--shadow-toolbar: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.5);
```

### Markup colors (user-selectable for arrows, text, shapes)

These are the user-pickable colors for markup tools, fixed values that don't change between modes:

```css
--mark-red: #ef4444;
--mark-amber: #f59e0b;
--mark-green: #10b981;
--mark-blue: #3b82f6;
--mark-white: #ffffff;
--mark-black: #1a1a1a;
```

Six options is the right number. More creates decision fatigue, fewer is too constrained. Default selected is `--mark-red` (most common annotation use case).

---

## Typography

System font stack. No web fonts — they cost a network round-trip and undermine the "no third party" promise.

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-mono: ui-monospace, 'SF Mono', 'Menlo', 'Consolas', monospace;
```

### Type scale

| Use | Size | Weight | Tracking | Notes |
|---|---|---|---|---|
| Hero title (empty state) | 22px | 500 | -0.01em | "Redact" on the empty page |
| Section heading | 18px | 500 | -0.005em | Rare in this app |
| Body | 14px | 400 | 0 | Most UI text |
| Body emphasis | 14px | 500 | 0 | File names, button labels |
| Small | 12px | 400 | 0 | Toolbar labels, captions |
| Meta | 11px | 500 | 0.06em | "BLOCK", "REDACT" labels (uppercase) |
| Mono numeric | 12-13px | 400 | 0 | "30 px", "1280×800" |

### Sentence case rule

All UI strings are sentence case: "Choose image", "Save", "Block size". Exception: meta labels above sliders or toolbar groups can be uppercase with letterspacing ("BLOCK", "REDACT") because the typographic treatment carries the meaning.

---

## Spacing scale

Use rem for vertical rhythm, px for component-internal gaps.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-8: 48px;
--space-10: 64px;
```

Page-level breathing room around the canvas: `--space-5` minimum on mobile, `--space-6` on desktop.

---

## Border radius scale

```css
--radius-sm: 6px;    /* small buttons, color swatches */
--radius-md: 8px;    /* tool icons, input fields */
--radius-lg: 10px;   /* tool icon containers in active state */
--radius-xl: 12px;   /* toolbar pills, settings drawer */
--radius-2xl: 14px;  /* large toolbar containers */
--radius-image: 6px; /* the image canvas itself */
```

The dot-grid surface (canvas-area) uses `--radius-xl`. Image inside uses `--radius-image`.

---

## Dot grid surface

The signature visual element. The canvas area (where the image sits) has a subtle dot grid.

```css
.canvas-surface {
  background-color: var(--surface-canvas);
  background-image: radial-gradient(
    circle,
    var(--surface-dot) 1px,
    transparent 1px
  );
  background-size: 16px 16px;
  background-position: 0 0;
}
```

**Important:** The dot grid is on the *surrounding surface*, not on the image itself. The image is a clean rectangle on top. Don't apply the grid to the image's background or behind transparent images — it would show through and break the illusion.

---

## Layout

### Mobile (< 768px)

Single-column, full-height layout:

```
┌─────────────────────────┐
│ Top bar (file, export)  │  56px
├─────────────────────────┤
│                         │
│                         │
│   Dot-grid canvas       │
│   surface with image    │  flex: 1
│                         │
│                         │
├─────────────────────────┤
│ Settings drawer (opt.)  │  56px when shown
├─────────────────────────┤
│ Toolbar pill            │  72px (incl. safe area)
└─────────────────────────┘
```

Bottom toolbar uses `padding-bottom: env(safe-area-inset-bottom)` to clear iOS home indicator.

### Desktop (≥ 768px)

The toolbar floats over the canvas surface, not anchored to bottom:

```
┌──────────────────────────────────────────┐
│ ┌─[file]─────┐  ┌───[undo][export]──────┐│
│ │            │                           │
│ │                                        │
│ │       Dot-grid canvas surface         │
│ │       with image                       │
│ │                                        │
│ │                                        │
│ │      ┌──[settings strip]──┐           │
│ │      ┌──[toolbar pill]────┐           │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

Page padding: 32px on all sides at desktop, 16px on mobile.

---

## Component specs

### Toolbar pill

The primary tool selector, a floating pill at the bottom-center of the canvas surface.

```
┌─────────────────────────────────────────────┐
│ [Bx] [Px] [Bl] │ [Re] [Ar] [Tx] │ [Un] [Cl] │
└─────────────────────────────────────────────┘
   redact         markup           actions
```

- **Container:** `background: var(--surface-elevated-glass); backdrop-filter: blur(20px); border: 0.5px solid var(--border-hairline); border-radius: var(--radius-2xl); padding: 6px; box-shadow: var(--shadow-toolbar);`
- **Icon button:** `width: 36px; height: 36px; border-radius: var(--radius-lg); background: transparent; border: none;`
- **Active icon button:** `background: var(--ink-primary); color: var(--ink-inverse);`
- **Icon size:** 16px stroke-width 1.5 for outline icons, 16px for filled. Pixelate icon is a 3×3 grid of 4px squares with varying opacities.
- **Group separator:** `width: 1px; height: 22px; background: var(--border-hairline); margin: 0 4px;`

The toolbar groups three categories: redact (3 tools), markup (3-4 tools), actions (2 tools). On mobile this stays horizontal. On very narrow viewports (<360px), drop the dividers and let it scroll horizontally.

### Settings strip (above the toolbar)

When the active tool has settings, a small pill appears just above the toolbar with the relevant control. Examples:

- Pixelate active → "BLOCK [slider] 30 px"
- Blur active → "BLUR [slider] 20 px"
- Black box active → no settings strip (it has no parameters)
- Markup tools active → 6 color swatches + stroke width slider

```
┌──────────────────────────────────┐
│ BLOCK  [────●──────]   30 px     │
└──────────────────────────────────┘
```

- **Container:** `background: var(--surface-elevated-glass); backdrop-filter: blur(20px); border: 0.5px solid var(--border-hairline); border-radius: var(--radius-xl); padding: 8px 12px; box-shadow: var(--shadow-toolbar);`
- **Label:** 11px, monospace, uppercase, color `var(--ink-tertiary)`, `letter-spacing: 0.06em`
- **Slider:** `accent-color: var(--ink-primary); flex: 1; min-width: 120px;`
- **Value readout:** monospace, 12-13px, color `var(--ink-primary)`, fixed minimum width so the slider doesn't jitter as the number changes

The settings strip is positioned above the toolbar with `--space-2` gap. On mobile, it spans the full content width minus page padding. On desktop, it can be narrower and sit centered above the toolbar pill.

### File label (top-left)

A small glass pill showing the current file name and dimensions.

```
┌──────────────────────────────────┐
│ [■] screenshot.png   1280×800    │
└──────────────────────────────────┘
```

- 14px tall × 12px padding
- Small black square (12×12) as the file icon, then file name in 12px medium weight, then dimensions in 11px monospace, color `var(--ink-tertiary)`

### Action buttons (top-right)

```
┌──────┐  ┌────────┐
│ Undo │  │ Export │
└──────┘  └────────┘
```

- **Undo:** glass pill style (matches file label), with undo icon + label
- **Export:** solid black button (`background: var(--ink-primary); color: var(--ink-inverse)`), 14px label, 12px horizontal padding

When there's nothing to undo, undo button shows `color: var(--ink-disabled)` and is non-interactive.

### Empty state

The page that shows when no image is loaded. Centered content, very simple:

```
        ┌────┐
        │ Bx │   (the redactr "icon" — small black square)
        └────┘

         Redactr

  Black box, pixelate, blur. Plus
  arrows, text, shapes. Stays in
  your browser.

  ┌─────────────────────────────┐
  │      Choose image           │
  └─────────────────────────────┘

      OR PASTE · OR DROP
```

- Icon: 48×48 black filled square with `border-radius: var(--radius-lg)`, white redaction-bar shape inside (12×8 white rect)
- Title: 22px, weight 500, `letter-spacing: -0.01em`
- Subtitle: 14px, color `var(--ink-secondary)`, max-width 320px, `line-height: 1.5`
- CTA button: full-width on mobile, 280px max on desktop, 48px tall, solid black background, white text, 14px medium
- Hint text: 11px, monospace, uppercase, letterspacing 0.04em, color `var(--ink-tertiary)`

The whole empty state should breathe. ~32px between icon and title, 12px title to subtitle, 32px subtitle to CTA, 12px CTA to hint.

### Selection rectangle (on canvas)

While the user is drawing a selection (before they release), show a 1.5px solid accent-blue rectangle with no fill. After release, the appropriate redaction or markup is applied and the rectangle disappears.

```css
.selection-preview {
  border: 1.5px solid var(--accent-canvas-selection);
  background: rgba(37, 99, 235, 0.08); /* very subtle fill so the area is visible */
}
```

This is the *only* place the accent blue appears. Never on chrome.

### Color swatches (for markup tools)

```
( ) ( ) ( ) ( ) ( ) ( )
red amber green blue white black
```

- Each swatch: 28×28, `border-radius: 50%`
- Inactive: 2px solid `var(--border-hairline)`
- Active: 2px solid `var(--ink-primary)`
- White swatch needs an inner border so it's visible on light backgrounds: 1px solid `var(--border-emphasis)` inside the colored fill
- Tap target should extend to 36×36 invisibly (use padding inside a button) for touch reach

---

## Interaction states

### Hover (desktop only)

- Toolbar buttons: `background: var(--border-hairline)` (very subtle)
- Active button on hover: stays the same (already at max emphasis)
- Color swatches: scale to 1.1 with `transition: transform 100ms ease`

### Focus (keyboard navigation)

- All interactive elements: `box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.4)` outside the element's normal border
- Outline-offset 2px

### Active/pressed

- Buttons: `transform: scale(0.96); transition: transform 80ms ease`
- This includes tool buttons, color swatches, and the export button

### Disabled

- `opacity: 0.4; pointer-events: none;`
- Don't change the layout, just dim it

---

## Motion

Keep it minimal. Three types of transitions only:

1. **Color/background changes:** 100-150ms ease
2. **Press feedback:** 80ms ease on transform: scale
3. **Theme toggle:** 200ms ease on color/background of body and major surfaces

No transitions on:
- Element appearance/disappearance (settings strip, file label)
- Layout changes (toolbar reflowing)
- The image canvas itself
- Modal/drawer slides

If something appears, it appears. If something disappears, it disappears. No fades, no slides.

---

## Accessibility

- All buttons have visible focus rings
- Color is never the only signal (active tool has a clear fill change, not just a color shift)
- Minimum touch target: 36×36 (smaller swatches use invisible padding to expand reach)
- Theme toggle works without JavaScript via OS preference
- Slider values are announced via `aria-valuenow`
- All icons have `aria-label` or accompanying visible text
- The canvas itself uses `role="img"` with a description after the user loads an image

---

## What we are not doing in v1

These are intentional cuts. Don't add them without discussion:

- **Per-element selection / move / resize after placing.** When you draw a redaction, it's committed. To change it, undo and redraw. v2 will add per-element handles.
- **Pinch-zoom on the image.** v2.
- **Rotate / crop.** v2.
- **Multi-image batch.** v2.
- **Custom color picker.** v2 — six presets is enough.
- **Numbered step badges (1, 2, 3 callouts).** v2.
- **Highlighter tool.** v2.
- **Keyboard shortcuts visible in UI.** Implement basic ones (cmd+z, esc) but don't show a shortcut help panel.
- **Help modal.** The UI is self-explanatory.
- **Onboarding tour.** Don't.

---

## Reference: the mockups we agreed on

The visual direction was locked in conversation with mockups showing the desktop and mobile editing states. Those mockups establish:

- Warm cream surface with darker recessed canvas area
- Floating toolbar pill at bottom-center, frosted/glass look
- Three-group toolbar with thin dividers
- Settings strip above the toolbar showing only the relevant slider
- File label and action buttons in the top corners as glass pills
- Active tool: solid black fill, white icon
- Selection rectangle: 1.5px blue, no fill (or very faint blue fill)

Implement to match that direction. When the spec leaves room for judgment, err toward "quieter, more restrained, more like a tool" rather than "more decorated."
