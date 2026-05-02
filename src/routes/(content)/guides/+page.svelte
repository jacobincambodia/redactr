<script>
  // Stylized head silhouette used by the pixelation-strength comparison in
  // the "are blurred or pixelated images safe?" section. Each grid maps
  // single characters to a small palette so the SVG markup stays compact.
  const PALETTE = {
    C: '#f0e8d8', // cream background
    H: '#3a2a1a', // dark hair
    S: '#e8c7a0', // skin
    E: '#1a1a1a', // eye
    M: '#8a4a3a', // mouth shadow
    G: '#7a8a9a', // shoulder/clothing
    D: '#6e5848', // averaged hair-on-cream (for the strong block)
    T: '#c8a890', // averaged skin-and-hair
    Y: '#8a8888', // averaged skin-and-shoulder
  };

  // 15×15 grid of 8-px cells — what fixed-block pixelation tools produce.
  // Face structure is still loosely visible, which is why these have been
  // shown reversible against text and faces in published research.
  const WEAK_GRID = [
    'CCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCC',
    'CCCCCCHHHCCCCCC',
    'CCCCHHHHHHHCCCC',
    'CCCHHHHHHHHHCCC',
    'CCCHHHSSSHHHCCC',
    'CCCHSSESESSHCCC',
    'CCCHSSSSSSSSHCC',
    'CCCHSSSSSSSSHCC',
    'CCCHSSSSMSSSHCC',
    'CCCCSSSSSSSCCCC',
    'CCCCCSSSSSCCCCC',
    'CCCGGGGGGGGGCCC',
    'CGGGGGGGGGGGGGC',
    'GGGGGGGGGGGGGGG',
  ];

  // 6×6 grid of 20-px cells — close to what Redactr produces at default
  // strength (block size scales with the region's smaller dimension).
  // Colors are averaged across what the weak grid showed in the same area.
  const DEFAULT_GRID = [
    'CCCCCC',
    'CCDDCC',
    'CDTTDD',
    'CTTTTC',
    'CYYYYC',
    'GGGGGG',
  ];

  function gridCells(grid, cellSize) {
    const cells = [];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        cells.push({ x: x * cellSize, y: y * cellSize, fill: PALETTE[grid[y][x]] });
      }
    }
    return cells;
  }
</script>

<svelte:head>
  <title>Guides — How to redact images privately, in your browser</title>
  <meta name="description" content="Step-by-step guides for common redaction tasks: blur a face, black out text, redact a screenshot, and how to think about whether a redaction is actually safe." />
  <meta property="og:title" content="Redactr guides" />
  <meta property="og:description" content="How to blur a face, black out text, redact a screenshot, and tell whether a redaction is really safe." />
</svelte:head>

<article>
  <h1>Guides</h1>
  <p class="lede">Short walk-throughs for the redaction tasks people land on Redactr to do. Pick the one closest to what you need.</p>

  <h2 id="redact-screenshot">How to redact a screenshot</h2>
  <p>Most screenshots have something you'd rather not share — a name, an email, a chat handle, a balance. The flow is the same regardless of source.</p>
  <ol>
    <li>Open <a href="/">the Redactr editor</a>. On a phone, add it to your home screen first if you'll do this often.</li>
    <li>Drop the screenshot file, paste it from the clipboard with <kbd>⌘/Ctrl + V</kbd>, or tap <strong>Choose image</strong>.</li>
    <li>The black box tool is selected by default — that's the safest option for most cases. Drag a rectangle over the sensitive area.</li>
    <li>Repeat for every region. Stack as many redactions as you need.</li>
    <li>Click <strong>Export</strong>. The file downloads as <kbd>your-screenshot-redacted.png</kbd>, with <kbd>EXIF</kbd> and GPS metadata stripped automatically.</li>
  </ol>
  <p>Black box overwrites the pixels underneath, so the exported file contains nothing recoverable in those regions.</p>

  <h2 id="blur-face">How to blur a face in a photo</h2>
  <p>Blur is the right call when you want the redacted area to look natural — for instance, a face in a crowd that you want to anonymize without drawing attention to it.</p>
  <ol>
    <li>Load the photo into <a href="/">the editor</a>.</li>
    <li>Pick the <strong>blur</strong> tool from the toolbar.</li>
    <li>Switch the shape to <strong>ellipse</strong> in the settings strip — faces are more circular than rectangular.</li>
    <li>Drag an oval over the face. The blur applies on release.</li>
    <li>Click the placed blur to select it. Drag a corner to fit it to the face precisely. Push the strength slider higher if you need more obscuration.</li>
    <li>Export.</li>
  </ol>
  <p>Redactr applies the blur twice in sequence. Single-pass blur has been shown reversible in some adversarial cases; double-pass is dramatically harder. If you want the strongest possible privacy, use black box instead.</p>

  <h2 id="black-out-text">How to black out text in an image</h2>
  <p>Black-out is the cleanest way to hide a name, address, account number, or any text in a photo or screenshot.</p>
  <ol>
    <li>Load the image.</li>
    <li>The black box tool is already selected. Keep the shape as <strong>rectangle</strong>.</li>
    <li>Drag a rectangle over the text you want to hide. Cover a little extra on the edges to be safe.</li>
    <li>Optional: use the <strong>text</strong> tool to write a label on top of the black box (e.g. "REDACTED" or a category name). The text tool always places new text — clicking on a black box won't accidentally select it.</li>
    <li>Export.</li>
  </ol>

  <h2 id="are-blurred-images-safe">Are blurred or pixelated images really safe?</h2>
  <p>Sometimes. It depends on which tool you used and how aggressively.</p>

  <div class="compare-row" role="group" aria-label="Pixelation strength comparison">
    <figure>
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="120" height="120" fill="#f0e8d8" />
        <path d="M5 120 L20 78 L100 78 L115 120 Z" fill="#7a8a9a" />
        <rect x="50" y="68" width="20" height="14" fill="#e8c7a0" />
        <ellipse cx="60" cy="48" rx="24" ry="28" fill="#e8c7a0" />
        <path d="M36 38 Q60 14 84 38 Q84 26 76 22 Q60 14 44 22 Q36 26 36 38 Z" fill="#3a2a1a" />
        <ellipse cx="51" cy="48" rx="2" ry="3" fill="#1a1a1a" />
        <ellipse cx="69" cy="48" rx="2" ry="3" fill="#1a1a1a" />
        <path d="M52 60 Q60 64 68 60" stroke="#7a4a3a" stroke-width="1.5" fill="none" stroke-linecap="round" />
      </svg>
      <figcaption>original</figcaption>
    </figure>
    <figure>
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true">
        {#each gridCells(WEAK_GRID, 8) as c (c.x + ',' + c.y)}
          <rect x={c.x} y={c.y} width="8" height="8" fill={c.fill} />
        {/each}
      </svg>
      <figcaption>weak (8 px blocks)</figcaption>
    </figure>
    <figure>
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true">
        {#each gridCells(DEFAULT_GRID, 20) as c (c.x + ',' + c.y)}
          <rect x={c.x} y={c.y} width="20" height="20" fill={c.fill} />
        {/each}
      </svg>
      <figcaption>Redactr default</figcaption>
    </figure>
  </div>
  <p><strong>Pixelate</strong> at small block sizes is reversible. Researchers have demonstrated recovering credit-card numbers, license plates, and faces from images pixelated with fixed small blocks. Redactr scales pixelation strength with the region you draw, so blocks stay aggressive relative to whatever's underneath — at full strength, there's not enough structure left for known recovery attacks to work. At lower strengths, treat the result as obscured rather than hidden.</p>
  <p><strong>Single-pass blur</strong> can be partially reversed in some adversarial scenarios. Redactr applies blur <strong>twice</strong>, with strength scaled to the region — dramatically harder to reverse than the single-pass kind. Still: blur is not as final as black box.</p>
  <p><strong>Black box</strong> overwrites the pixels underneath. The exported file contains a black rectangle and nothing else in that region — there is nothing to recover. This is the only redaction that is truly final regardless of attacker capability.</p>
  <p>Black box is the safest choice when you're unsure.</p>

  <h2 id="redact-on-phone">How to redact an image on your phone</h2>
  <p>Redactr is built mobile-first. The editor works the same on a phone as on a laptop.</p>
  <ol>
    <li>Open the page in your phone's browser. Add it to your home screen so it's one tap away the next time you need it.</li>
    <li>Tap <strong>Choose image</strong>. Your phone will offer the photo library, the file picker, and (on most devices) the camera. Pick whatever you need.</li>
    <li>The toolbar at the bottom is sized for one-thumb use. Drag with your finger to draw redactions.</li>
    <li>Tap an existing annotation to select it; drag to move; drag a corner to resize.</li>
    <li>Tap <strong>Export</strong>. The redacted image downloads to your camera roll or Files app.</li>
  </ol>
  <p>Because everything happens on-device, this works the same whether you have signal or not. Useful when you're somewhere the connection is bad and you don't want to wait, or somewhere the connection is hostile and you don't want to upload.</p>
</article>

<style>
  .compare-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
    max-width: 480px;
    margin: var(--space-4) 0 var(--space-5);
  }
  .compare-row figure {
    margin: 0;
  }
  .compare-row svg {
    width: 100%;
    height: auto;
    display: block;
    border-radius: var(--radius-image);
    box-shadow: var(--shadow-canvas);
    background: #f0e8d8;
  }
  .compare-row figcaption {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--ink-tertiary);
    text-align: center;
    margin-top: var(--space-2);
    letter-spacing: 0.04em;
  }
</style>
