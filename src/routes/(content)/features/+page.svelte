<script>
  import { onMount } from 'svelte';
  import {
    blackBox,
    pixelate,
    blur,
    drawRect,
    drawArrow,
    drawText,
  } from '$lib/redact.js';

  let blackBoxCanvas;
  let pixelateCanvas;
  let blurCanvas;
  let shapeRectCanvas;
  let shapeEllipseCanvas;
  let rectMarkupCanvas;
  let arrowMarkupCanvas;
  let textMarkupCanvas;

  // Synthetic scene with a face and "text" bars — same on every demo so the
  // viewer can tell what's been changed by each tool.
  function drawScene(canvas) {
    canvas.width = 480;
    canvas.height = 280;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // Sky-ish gradient background
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#bfdbfe');
    sky.addColorStop(1, '#fed7aa');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Face on the left — a circle with eyes and a smile so the redaction is obvious
    const cx = 150;
    const cy = H / 2;
    const r = 78;
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(cx - 22, cy - 18, 6, 0, Math.PI * 2);
    ctx.arc(cx + 22, cy - 18, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineCap = 'round';
    ctx.arc(cx, cy + 10, 22, 0.25, Math.PI - 0.25);
    ctx.stroke();

    // "Text" bars on the right — represent sensitive lines you'd want to redact
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(280, 90, 160, 14);
    ctx.fillRect(280, 116, 130, 14);
    ctx.fillRect(280, 152, 180, 14);
    ctx.fillRect(280, 178, 110, 14);
    return ctx;
  }

  onMount(() => {
    if (blackBoxCanvas) {
      const ctx = drawScene(blackBoxCanvas);
      blackBox(ctx, 270, 80, 200, 130, 'rect');
    }
    if (pixelateCanvas) {
      const ctx = drawScene(pixelateCanvas);
      pixelate(ctx, pixelateCanvas, 72, 62, 156, 156, 24, 'rect');
    }
    if (blurCanvas) {
      const ctx = drawScene(blurCanvas);
      blur(ctx, blurCanvas, 72, 62, 156, 156, 14, 'ellipse');
    }
    if (shapeRectCanvas) {
      const ctx = drawScene(shapeRectCanvas);
      blackBox(ctx, 72, 62, 156, 156, 'rect');
    }
    if (shapeEllipseCanvas) {
      const ctx = drawScene(shapeEllipseCanvas);
      blackBox(ctx, 72, 62, 156, 156, 'ellipse');
    }
    if (rectMarkupCanvas) {
      const ctx = drawScene(rectMarkupCanvas);
      drawRect(ctx, 60, 50, 180, 180, '#ef4444', 5);
    }
    if (arrowMarkupCanvas) {
      const ctx = drawScene(arrowMarkupCanvas);
      drawArrow(ctx, 380, 40, 180, 130, '#ef4444', 6);
    }
    if (textMarkupCanvas) {
      const ctx = drawScene(textMarkupCanvas);
      drawText(ctx, 280, 230, 'redacted', '#ef4444', 32, false, { bold: true });
    }
  });
</script>

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

  <div class="feature">
    <div class="feature-demo">
      <canvas bind:this={blackBoxCanvas} aria-label="Black box redaction example"></canvas>
    </div>
    <div class="feature-text">
      <h3>Black box</h3>
      <p>Solid black rectangle or ellipse over the area you draw. The original pixels under the box are overwritten — no recovery possible. This is the safest option and the one selected by default.</p>
    </div>
  </div>

  <div class="feature">
    <div class="feature-demo">
      <canvas bind:this={pixelateCanvas} aria-label="Pixelate redaction example"></canvas>
    </div>
    <div class="feature-text">
      <h3>Pixelate</h3>
      <p>Scrambles the area into chunky blocks. The default block size is 30 px, deliberately aggressive. Most tools default to 8–12 px blocks, which has been shown reversible against text and faces in published research. 30 px destroys the structure that recovery attacks rely on.</p>
    </div>
  </div>

  <div class="feature">
    <div class="feature-demo">
      <canvas bind:this={blurCanvas} aria-label="Blur redaction example"></canvas>
    </div>
    <div class="feature-text">
      <h3>Blur</h3>
      <p>Gaussian blur applied twice in sequence. Single-pass blur has been demonstrated reversible in some adversarial scenarios; double-pass is dramatically harder. Use blur when you want the area to read as obscured rather than hidden.</p>
    </div>
  </div>

  <h2>Shapes</h2>
  <p>Each redaction tool supports either a rectangle or an ellipse. Rectangles are right for screenshots and labelled regions; ellipses match faces, license plates, and circular signs more cleanly.</p>

  <div class="shape-pair">
    <figure>
      <canvas bind:this={shapeRectCanvas} aria-label="Rectangle shape example"></canvas>
      <figcaption>Rectangle</figcaption>
    </figure>
    <figure>
      <canvas bind:this={shapeEllipseCanvas} aria-label="Ellipse shape example"></canvas>
      <figcaption>Ellipse</figcaption>
    </figure>
  </div>

  <h2>Markup</h2>
  <p class="muted">Tools to point at things, not hide them.</p>

  <div class="feature">
    <div class="feature-demo">
      <canvas bind:this={rectMarkupCanvas} aria-label="Rectangle markup example"></canvas>
    </div>
    <div class="feature-text">
      <h3>Rectangle</h3>
      <p>Outlined rectangle. Pick from six preset colors, adjust stroke width.</p>
    </div>
  </div>

  <div class="feature">
    <div class="feature-demo">
      <canvas bind:this={arrowMarkupCanvas} aria-label="Arrow markup example"></canvas>
    </div>
    <div class="feature-text">
      <h3>Arrow</h3>
      <p>Line with an arrowhead at the end. Same color and stroke options. The arrowhead scales with the stroke so thicker arrows feel proportional.</p>
    </div>
  </div>

  <div class="feature">
    <div class="feature-demo">
      <canvas bind:this={textMarkupCanvas} aria-label="Text markup example"></canvas>
    </div>
    <div class="feature-text">
      <h3>Text</h3>
      <p>Click or tap to place an insertion point, then type. Bold, italic, and underline are all available. Drag a corner of the placed text to scale it up or down.</p>
    </div>
  </div>

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

<style>
  .feature {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
    align-items: start;
  }
  @media (min-width: 640px) {
    .feature {
      grid-template-columns: 280px 1fr;
      gap: var(--space-5);
      align-items: center;
    }
  }
  .feature-demo {
    width: 100%;
  }
  .feature-demo canvas {
    width: 100%;
    height: auto;
    display: block;
    border-radius: var(--radius-image);
    box-shadow: var(--shadow-canvas);
    background: #ffffff;
  }
  .feature-text h3 {
    margin-top: 0 !important;
  }
  .feature-text p {
    margin-bottom: 0 !important;
  }

  .shape-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    margin-bottom: var(--space-6);
    max-width: 600px;
  }
  .shape-pair figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .shape-pair canvas {
    width: 100%;
    height: auto;
    display: block;
    border-radius: var(--radius-image);
    box-shadow: var(--shadow-canvas);
    background: #ffffff;
  }
  .shape-pair figcaption {
    font-size: 13px;
    color: var(--ink-tertiary);
    text-align: center;
  }
</style>
