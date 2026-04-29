<svelte:head>
  <title>Features — Redactr</title>
  <meta name="description" content="Black box, pixelate, and blur redaction with rectangle or ellipse shapes. Arrow, rectangle, and text markup. Edit any annotation after placing. Runs entirely in your browser." />
  <meta property="og:title" content="Features — Redactr" />
  <meta property="og:description" content="Three redaction tools, three markup tools, edit-after-place, all in your browser." />
</svelte:head>

<article>
  <h1>Features</h1>
  <p class="lede">Redactr is a small, fast image redaction and markup tool that runs entirely in your browser. No upload, no account, no tracking.</p>

  <h2>Redaction</h2>
  <p class="muted">Three masks. Each one is permanent — the exported file contains only the final pixels.</p>

  <h3>Black box</h3>
  <p>Solid black rectangle or ellipse over the area you draw. The original pixels under the box are overwritten — no recovery possible. This is the safest option and the one selected by default.</p>

  <h3>Pixelate</h3>
  <p>Scrambles the area into chunky blocks. The default block size is 30 px, deliberately aggressive. Most tools default to 8–12 px blocks, which has been shown reversible against text and faces in published research. 30 px destroys the structure that recovery attacks rely on.</p>

  <h3>Blur</h3>
  <p>Gaussian blur applied twice in sequence. Single-pass blur has been demonstrated reversible in some adversarial scenarios; double-pass is dramatically harder. Use blur when you want the area to read as obscured rather than hidden.</p>

  <h2>Markup</h2>
  <p class="muted">Tools to point at things, not hide them.</p>

  <h3>Rectangle</h3>
  <p>Outlined rectangle. Pick from six preset colors, adjust stroke width.</p>

  <h3>Arrow</h3>
  <p>Line with an arrowhead at the end. Same color and stroke options. The arrowhead scales with the stroke so thicker arrows feel proportional.</p>

  <h3>Text</h3>
  <p>Click or tap to place an insertion point, then type. Bold, italic, and underline are all available. Drag a corner of the placed text to scale it up or down.</p>

  <h2>Shapes</h2>
  <p>The three redaction tools each support either a rectangle or an ellipse. Rectangles are right for screenshots and labeled regions; ellipses match faces, license plates, and circular signs more cleanly.</p>

  <h2>Edit after placing</h2>
  <p>Click any annotation to select it. Drag the body to move it, drag a corner to resize it. Change the color, stroke, font size, shape, or text style from the toolbar — without redrawing. Press <code>Delete</code> or <code>Backspace</code> to remove the selected annotation; <code>Esc</code> to deselect.</p>

  <h2>Privacy</h2>
  <ul>
    <li>Runs entirely in your browser — no upload, no server, no API call</li>
    <li>No accounts, no logins, no profiles</li>
    <li>No analytics, no third-party scripts at runtime</li>
    <li>Works offline once the page has loaded</li>
    <li>Image metadata (EXIF, GPS, color profiles) is stripped on export</li>
  </ul>

  <h2>Workflow</h2>
  <ul>
    <li>Drop a file, paste a clipboard image (<code>⌘/Ctrl + V</code>), or pick from your device</li>
    <li>Stack multiple redactions and markup on the same image</li>
    <li>Undo with <code>⌘/Ctrl + Z</code></li>
    <li>Light, dark, and system theme</li>
    <li>Built mobile-first; touch targets sized for one-thumb use</li>
  </ul>

  <h2>Supported formats</h2>
  <p>Redactr opens <strong>JPEG, PNG, GIF, and WebP</strong>. Exports are <strong>PNG</strong>, always re-encoded through canvas so original metadata is dropped.</p>
</article>
