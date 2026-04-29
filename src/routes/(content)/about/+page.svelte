<svelte:head>
  <title>About — Redactr</title>
  <meta name="description" content="Redactr is a browser-based image redaction tool. Nothing leaves your device. No accounts, no tracking, no servers." />
  <meta property="og:title" content="About Redactr" />
  <meta property="og:description" content="A browser-based image redaction tool that keeps every image on your device." />
</svelte:head>

<article>
  <h1>About Redactr</h1>
  <p class="lede">Redactr is a small image redaction tool that runs entirely in your browser. Drop in a screenshot or photo, hide what shouldn't be public, export. The image you load never leaves your device.</p>

  <h2>Why a browser tool</h2>
  <p>Most redaction tools either upload your image to a server, require an account, or both. That's the wrong default for a sensitive image. The promise that "your data is encrypted in transit" doesn't help if the server keeps a copy.</p>
  <p>Redactr does the redaction itself. There is no server side to compromise — the page is HTML, CSS, and JavaScript that runs locally. You can verify this in your browser's network panel: once the page is loaded, nothing more is sent.</p>

  <h2>Frequently asked</h2>

  <p class="faq-q">Is my image really private?</p>
  <p class="faq-a">Yes. The page loads once, then runs entirely on your device. There is no server endpoint that receives images. If you're suspicious — and you should be — open your browser's developer tools, switch to the network tab, and reload. After the initial page load, you'll see no further requests as you redact.</p>

  <p class="faq-q">Does it work offline?</p>
  <p class="faq-a">Yes. After your first visit, the page is cached and works without a network connection. Useful in the field, useful when the network is slow, useful when the network is hostile.</p>

  <p class="faq-q">Does Redactr strip metadata?</p>
  <p class="faq-a">Yes. When you export, the image is re-encoded through canvas, which drops EXIF (including GPS), color profiles, and any embedded thumbnails. Even if you don't redact anything, exporting a file through Redactr is a quick way to strip its metadata.</p>

  <p class="faq-q">Are blurred or pixelated images really irreversible?</p>
  <p class="faq-a">Pixelate and blur use deliberately aggressive defaults — 30 px blocks for pixelate, double-pass gaussian for blur — to defeat the published attacks against under-blurred or under-pixelated images. Black box is the safest option because it overwrites the pixels entirely. When in doubt, use black box. The <a href="/guides#are-blurred-images-safe">guides page</a> explains this in more detail.</p>

  <p class="faq-q">Are there cookies, analytics, or third-party scripts?</p>
  <p class="faq-a">No. There is no analytics. There are no third-party scripts that load at runtime. Your theme preference (light, dark, or system) is stored in <code>localStorage</code> on your device only — Redactr can't read it remotely because there is no remote.</p>

  <p class="faq-q">What formats are supported?</p>
  <p class="faq-a">Redactr opens JPEG, PNG, GIF, and WebP files. Exports are always PNG.</p>

  <p class="faq-q">What can it not do yet?</p>
  <p class="faq-a">Redactr is small on purpose. It does not do PDF redaction, video redaction, freeform shapes, or emoji masks. Some of those will land later. If you need any of them today, Redactr is not the tool.</p>

  <p class="faq-q">How much does it cost?</p>
  <p class="faq-a">Nothing. There is no paid tier and no plan to add one.</p>

  <p class="faq-q">Who built it?</p>
  <p class="faq-a">An investigative researcher who needed strong, on-device redaction in the field and couldn't find a tool that ran fully in the browser without uploading the image somewhere first.</p>
</article>
