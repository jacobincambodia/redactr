# Feature specification

This document defines what Redactr does (and doesn't do) in v1, the algorithms used for redaction, and the deferred features for v2.

---

## v1 scope (the cut we're shipping)

### Loading images

The user can load a single image into the editor by:

1. **Selecting** via a file picker (button on the empty state, plus a "new image" affordance once editing)
2. **Pasting** with Cmd/Ctrl+V from clipboard (works for screenshots, copied images, image URLs)
3. **Dropping** a file onto the page

Supported formats: **JPEG, PNG, GIF, WebP**. Reject other types with a brief inline error ("Unsupported format — JPEG, PNG, GIF, or WebP only").

Maximum size: **soft cap at 4096×4096 px**. Larger images load but show a brief notice that they may be slow. Don't block the user.

When a new image is loaded, replace the current one — no warning, no confirmation. v2 may add a "you have unsaved changes" prompt.

### Redaction tools

Three tools, each with its own behavior and settings:

#### Black box
- Draws an opaque black rectangle over the selected region
- No settings (it's binary — either the box is there or it isn't)
- Default selected tool on first load
- This is the *most secure* option and should be visually emphasized (selected by default)

#### Pixelate
- Setting: **block size**, slider 5–80 px, default **30 px**
- "BLOCK 30 px" in the settings strip while active
- See algorithm below

#### Blur
- Setting: **blur radius**, slider 5–50 px, default **20 px**
- Applied **twice** in sequence for irreversibility (this is a deliberate choice — single-pass gaussian blur has been demonstrated reversible in some cases)
- "BLUR 20 px" in the settings strip while active
- See algorithm below

### Markup tools

Three tools in v1:

#### Rectangle
- Outline-only (no fill)
- Settings: color (6 presets), stroke width (slider 1–12 px, default 4)

#### Arrow
- Line with an arrowhead at the end point
- Settings: color (6 presets), stroke width (slider 1–12 px, default 4)
- Arrowhead size scales with stroke width

#### Text
- Click/tap to place an insertion point, then type in the inline text input that appears
- Press Enter or tap outside to commit
- Settings: color (6 presets), text size (slider 14–72 px, default 24)
- Text has a subtle 2px black outline (in light mode) or white outline (in dark mode) so it stays readable on any background

### Actions

- **Undo:** removes the most recent annotation. Single-level only in v1.
- **Clear all:** removes all annotations on the current image. Confirm with a brief inline "Clear all annotations?" → "Clear" / "Cancel"
- **Export:** downloads the flattened image as `<original-name>-redacted.png`

### Theme

- Default: match `prefers-color-scheme`
- Manual toggle button in a small corner of the UI (top-right area, next to the export button on desktop; in a settings menu on mobile if it doesn't fit)
- Persist user choice to `localStorage` under key `redactr.theme` (values: `light`, `dark`, `system`)

### Keyboard shortcuts (no UI for these in v1)

- **Cmd/Ctrl+Z**: undo
- **Cmd/Ctrl+C**: copy current rendered image to clipboard (when canvas has focus)
- **Esc**: cancel current draw / close text input

---

## Algorithms

### Pixelate

Pixelation must operate on the **original image data**, not on already-pixelated output. This is critical: if we sampled from the displayed canvas, multiple overlapping redactions would compound and the result would be inconsistent.

```
function pixelateRegion(ctx, originalImage, x, y, w, h, blockSize) {
  // Extract the region from the ORIGINAL image
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  off.getContext('2d').drawImage(originalImage, x, y, w, h, 0, 0, w, h);

  // Downsample to block-size resolution
  const sw = Math.max(1, Math.floor(w / blockSize));
  const sh = Math.max(1, Math.floor(h / blockSize));
  const small = document.createElement('canvas');
  small.width = sw;
  small.height = sh;
  const smallCtx = small.getContext('2d');
  smallCtx.imageSmoothingEnabled = false;
  smallCtx.drawImage(off, 0, 0, sw, sh);

  // Upsample back, with smoothing OFF (this creates the chunky blocks)
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, sw, sh, x, y, w, h);
}
```

Default block size of 30 px is *deliberately* aggressive. Most image-redaction tools use 8-12 px which has been shown to be partially reversible against text (see DeepCrack and similar academic work on un-pixelating credit card numbers). 30 px ensures that for typical face/text sizes in screenshots, no recognizable structure remains.

### Blur

Single-pass gaussian blur via `ctx.filter` is reversible in some adversarial scenarios. A double-pass with the same radius is dramatically harder to reverse.

```
function blurRegion(ctx, originalImage, x, y, w, h, radius) {
  // Extract region from original image
  const off1 = document.createElement('canvas');
  off1.width = w;
  off1.height = h;
  const off1Ctx = off1.getContext('2d');
  off1Ctx.filter = `blur(${radius}px)`;
  off1Ctx.drawImage(originalImage, x, y, w, h, 0, 0, w, h);

  // Second pass on the already-blurred result
  const off2 = document.createElement('canvas');
  off2.width = w;
  off2.height = h;
  const off2Ctx = off2.getContext('2d');
  off2Ctx.filter = `blur(${radius}px)`;
  off2Ctx.drawImage(off1, 0, 0);

  // Composite back to main canvas
  ctx.drawImage(off2, x, y);
}
```

Note that `ctx.filter` is supported in all modern browsers (Safari, Chrome, Firefox, Edge) but **not** in some older WebKit versions. We accept this — anyone old enough to lack `ctx.filter` is on a browser that's not getting security updates anyway.

### Black box

Trivial:

```
function blackBoxRegion(ctx, x, y, w, h) {
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, w, h);
}
```

The original pixels under the rectangle are replaced. They don't survive the export.

### Export

The export path **must** flatten everything to a fresh canvas, then encode to PNG via `canvas.toBlob`. This single step does three important things at once:

1. Strips all original-file metadata (EXIF, GPS, color profiles)
2. Burns the redactions and markup into the pixel data permanently
3. Drops any layer/annotation data — the output PNG is a single flat raster

```
function exportImage(originalImage, annotations, filename) {
  const out = document.createElement('canvas');
  out.width = originalImage.width;
  out.height = originalImage.height;
  const ctx = out.getContext('2d');

  // Draw the base image
  ctx.drawImage(originalImage, 0, 0);

  // Apply all annotations in order
  for (const ann of annotations) {
    drawAnnotation(ctx, ann, originalImage);
  }

  // Encode to PNG and trigger download
  out.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
```

**Critical:** Never use the original `File` object's bytes for the export. Always re-encode through canvas. This is what guarantees metadata stripping.

### Drawing input handling

Use **pointer events** (not mouse + touch separately) for unified input handling across mouse, touch, stylus.

```
canvas.addEventListener('pointerdown', startDraw);
canvas.addEventListener('pointermove', moveDraw);
canvas.addEventListener('pointerup', endDraw);
canvas.addEventListener('pointercancel', endDraw);

canvas.style.touchAction = 'none'; // prevents browser scroll/zoom while drawing
```

Coordinate translation must account for the canvas being displayed at a different size than its underlying pixel resolution:

```
function getCanvasPos(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}
```

### State management note

In Svelte 5 with runes, the slider value naturally flows through to the draw end-point because `$state` is reactive. The bug from the React prototype (where stale closure captured the slider value at draw-start, not draw-end) doesn't apply here. But verify by changing the block-size slider mid-drag and confirming the preview updates live.

---

## v2 deferred features (post-launch)

These are intentionally cut from v1. Add only after v1 is shipped, used by Jacob for at least a week, and the actual gaps are clear.

- **Per-element selection and editing** — click a placed annotation to select it, drag to move, handles to resize, delete key to remove
- **Pinch-zoom and pan** on the canvas (mobile especially)
- **Crop tool** — including aspect ratio presets (1:1, 16:9, 4:5, free)
- **Multi-image batch** — load multiple images, switch between them, "save all" exports each as a separate file
- **Highlighter** — semi-transparent colored rectangle for emphasis (different from the redaction blur which is for hiding)
- **Number badges** — sequenced "1, 2, 3" callouts for tutorial-style annotations
- **Custom color picker** for markup tools (alongside the 6 presets)
- **Ellipse tool** for markup
- **Pen / freehand draw** tool
- **Export to JPEG** (currently PNG only — for very large images JPEG would be smaller)
- **Quality settings** for export (PNG compression level, JPEG quality)
- **Keyboard shortcuts help overlay** triggered by `?`
- **PWA install prompt** with proper manifest, offline support
- **OG image / social preview** for the redactr.app landing page

### v2+ ideas (further down the road)

- **PDF support** — let user redact a multi-page PDF, export back as PDF
- **Video clip redaction** — redact a face across frames in a short MP4
- **OCR-assisted redaction** — auto-detect text regions and offer to redact common patterns (phone numbers, emails, etc.)
- **Browser extension** for one-click redaction on any image on a webpage

These are speculative. Don't pre-architect for them.

---

## Edge cases and explicit decisions

### Very small canvas selections

If the user releases the mouse/finger after dragging less than 4 px, treat it as a misclick. Don't create an annotation. This prevents accidental tiny redactions from a stray tap.

### Negative dimensions during draw

When the user drags from bottom-right to top-left, `width` and `height` end up negative. Normalize before storing the annotation:

```
if (w < 0) { x += w; w = -w; }
if (h < 0) { y += h; h = -h; }
```

### Image larger than viewport

Display the canvas at `max-width: 100%; max-height: 100%; object-fit: contain;` within its container. The underlying canvas resolution stays at the image's native resolution — only the display size changes. The coordinate translation in `getCanvasPos` handles this correctly.

### Clipboard paste with multiple items

If the clipboard contains multiple images (rare), use the first one. Don't prompt.

### Drag-and-drop with multiple files

If the user drops more than one file in v1, use the first one and silently discard the rest. v2 batch mode handles multiple.

### Loading a corrupted image

Browser's `Image.onerror` fires. Show a brief inline error: "Couldn't read that image. Try a different file." Don't crash, don't leave the empty state in a broken state.

### Export when no annotations have been made

Allowed. Just exports the original image re-encoded through canvas (which strips metadata). This is actually a useful feature on its own — a quick way to strip GPS/EXIF from a photo without modifying it.

---

## Performance budget

- First paint: < 1.5s on 3G
- Time to interactive: < 2.5s on 3G
- JS bundle: < 50KB gzipped (SvelteKit's static output is naturally small; this is achievable without effort)
- Image processing operations: < 200ms for typical screenshot sizes (1920×1080), < 1s for 4K images

If you find yourself needing a Web Worker for image processing, push back — likely the algorithm needs simplification, not parallelization.
