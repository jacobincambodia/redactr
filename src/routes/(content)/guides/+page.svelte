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
    <li>Drop the screenshot file, paste it from the clipboard with <code>⌘/Ctrl + V</code>, or tap <strong>Choose image</strong>.</li>
    <li>The black box tool is selected by default — that's the safest option for most cases. Drag a rectangle over the sensitive area.</li>
    <li>Repeat for every region. Stack as many redactions as you need.</li>
    <li>Click <strong>Export</strong>. The file downloads as <code>your-screenshot-redacted.png</code>, with EXIF and GPS metadata stripped automatically.</li>
  </ol>
  <p>Black box overwrites the pixels underneath, so the exported file contains nothing recoverable in those regions.</p>

  <h2 id="blur-face">How to blur a face in a photo</h2>
  <p>Blur is the right call when you want the redacted area to look natural — for instance, a face in a crowd that you want to anonymize without drawing attention to it.</p>
  <ol>
    <li>Load the photo into <a href="/">the editor</a>.</li>
    <li>Pick the <strong>blur</strong> tool from the toolbar.</li>
    <li>Switch the shape to <strong>ellipse</strong> in the settings strip — faces are more circular than rectangular.</li>
    <li>Drag an oval over the face. The blur applies on release.</li>
    <li>Click the placed blur to select it. Drag a corner to fit it to the face precisely. Change the blur radius from the slider if you need more obscuration.</li>
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
  <p><strong>Pixelate</strong> at small block sizes is reversible. Researchers have demonstrated recovering credit-card numbers, license plates, and faces from images that were pixelated with 8–12 px blocks. Redactr defaults to <strong>30 px</strong> for this reason — at that size, there's not enough structure left for known recovery attacks to work. If you've used a different tool with smaller blocks, treat the result as obscured, not hidden.</p>
  <p><strong>Single-pass blur</strong> can be partially reversed in some adversarial scenarios. Redactr applies blur <strong>twice</strong>, which is dramatically harder. Still: blur is not as final as black box.</p>
  <p><strong>Black box</strong> overwrites the pixels underneath. The exported file contains a black rectangle and nothing else in that region — there is nothing to recover. This is the only redaction that is truly final regardless of attacker capability.</p>
  <p>When in doubt, use black box.</p>

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
