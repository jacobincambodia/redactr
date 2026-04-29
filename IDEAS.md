# Ideas / backlog

Things noticed while using Redactr that are worth doing later. Append-only — bullet per item, one line. When something gets done, move it to a "shipped" section at the bottom or just delete it.

Format suggestion: `- [area] thing — short note`. No strict rules.

## Backlog

- [site] write actual page content for /about, /features, /guides — links exist on the empty state but go to anchors that don't resolve
- [site] split the homepage into separate pages (about, features, guides, contact) like redacted.app — for now we just put links below the dropzone; revisit once we know what each page needs to say
- [tools] freeform / lasso blur and pixelate (point-in-polygon trace) — ellipse handles most cases for now
- [tools] mobile delete-selected button — no keyboard Delete on phones; selection has no UI to remove one annotation right now (Clear nukes everything, Undo only works for the most recent)
- [tools] propagate last-used setting from selected annotation to defaults when deselected — so changing a selected arrow's color also changes the next-draw default
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
