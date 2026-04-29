# Ideas / backlog

Things noticed while using Redactr that are worth doing later. Append-only — bullet per item, one line. When something gets done, move it to a "shipped" section at the bottom or just delete it.

Format suggestion: `- [area] thing — short note`. No strict rules.

## Backlog

- [site] write actual page content for /about, /features, /guides — links exist on the empty state but go to anchors that don't resolve
- [site] split the homepage into separate pages (about, features, guides, contact) like redacted.app — for now we just put links below the dropzone; revisit once we know what each page needs to say
- [tools] freeform / lasso blur and pixelate (point-in-polygon trace) — ellipse handles most cases for now
- [tools] mobile delete-selected button — no keyboard Delete on phones; selection has no UI to remove one annotation right now (Clear nukes everything, Undo only works for the most recent)
- [tools] emoji masks — redacted.app covers a face/name/object with an emoji as a fourth redaction option. Probably belongs alongside black box / pixelate / blur. Picking which emoji and scaling it to fit a region is the real work.
- [tools] propagate last-used setting from selected annotation to defaults when deselected — so changing a selected arrow's color also changes the next-draw default
- [tools] optional readability outline/shadow toggle for text — removed from defaults in v1.2 because the black halo looked messy, but text on a busy background can be hard to read without it
- [tools] text bounds use a `length * fontSize * 0.6` approximation; on certain glyph-heavy strings the selection mark and hit-test trail the actual text by a few pixels — switch to canvas.measureText if it ever becomes a real problem
- [export] JPEG export option (smaller files for very large images)
- [export] copy rendered image to clipboard (Cmd+C) — keyboard handler is wired but the actual clipboard write isn't implemented yet
- [a11y] keyboard shortcut help overlay on `?`

## Open questions

- when redacted text or shapes are exported, do we need a way to verify metadata was actually stripped? (e.g. exiftool a sample export and confirm)

## Shipped

- v1 editor with all six tools, undo, clear, theme toggle, export
- dots more pronounced (11% light / 9% dark)
- toolbar visibility fix on tall images (canvas max-height now matches actual desktop padding)
- empty-state footer with supported-formats line, privacy line, and about/features/guides link placeholders (hidden once an image is loaded)
- bold / italic / underline for text annotations, including post-place edits
- ellipse mode for black box, pixelate, and blur (clipped via canvas path)
- per-element select / move / resize / edit-after-place with auto-select on draw, dashed selection outline, corner handles for rect-bounded tools, endpoint handles for arrows, Delete/Backspace to remove, Esc to deselect

### v1.2

- live canvas preview for arrow / rect markup / black-box (rect) during drag — no more blue selection rect for those, you see the actual shape as you draw it
- arrow defaults: stroke 8 (was 4), max 24, head size scaled up
- text defaults: font 48 (was 24), max 200 (was 72), no readability outline by default (cleaner; user picks contrasting color)
- text input UI: solid 1.5px border, rounded, larger min-width, more padding, soft shadow
- text annotations get 4 corner handles that scale the font uniformly from the opposite corner
- cursor reflects intent: crosshair while drawing, grab on selected body, grabbing while moving, nwse-resize / nesw-resize on corner handles
- size readouts in the settings strip round to integer (was showing 154.94767... after a resize)

### v1.3

- text tool always places new text — clicking on an existing annotation no longer selects it, so you can write labels on top of black boxes and blurs
- blur edges no longer feather: extracts a padded source region (radius * 3) so the gaussian kernel always has real pixel data to sample
- new home description: "Strong redaction. No upload. No account. Just your browser."
- new content pages at /features, /guides, /about with shared header (back-to-editor link) and footer (cross-page links + "Open the editor" CTA)
- SSR enabled for content pages (overrides root ssr=false), so search engines see fully prerendered HTML
- per-page <title> and <meta name="description"> via svelte:head; removed the global meta description from app.html so per-page descriptions actually win
- guides page covers the five most-likely landing tasks: redact a screenshot, blur a face, black out text, "are blurred images really safe?" (the differentiator), and how to redact on a phone
