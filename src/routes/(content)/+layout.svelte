<script>
  let { children } = $props();
</script>

<div class="content-page">
  <header class="content-header">
    <a class="brand" href="/" aria-label="Back to the Redactr editor">
      <span class="brand-mark" aria-hidden="true"><span class="brand-bar"></span></span>
      <span class="brand-name">Redactr</span>
    </a>
    <nav class="content-nav" aria-label="Pages">
      <a href="/features">Features</a>
      <a href="/guides">Guides</a>
      <a href="/about">About</a>
    </nav>
  </header>

  <main class="content-main">
    {@render children()}
  </main>

  <footer class="content-footer">
    <a class="cta-back" href="/">Open the editor</a>
    <p class="content-formats mono">JPEG · PNG · GIF · WebP</p>
    <p class="content-promise">No upload, no tracking, no account.</p>
    <nav class="content-footer-links" aria-label="Pages">
      <a href="/features">features</a>
      <span aria-hidden="true">·</span>
      <a href="/guides">guides</a>
      <span aria-hidden="true">·</span>
      <a href="/about">about</a>
      <span aria-hidden="true">·</span>
      <a href="https://x.com/jacobincambodia" rel="me noopener" target="_blank">@jacobincambodia</a>
    </nav>
  </footer>
</div>

<style>
  .content-page {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background-color: var(--surface-page);
    background-image: radial-gradient(circle, var(--surface-dot) 1px, transparent 1px);
    background-size: 16px 16px;
    background-position: 0 0;
    color: var(--ink-primary);
  }

  .content-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    gap: var(--space-4);
  }
  @media (min-width: 768px) {
    .content-header { padding: var(--space-5) var(--space-6); }
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    text-decoration: none;
    color: var(--ink-primary);
  }
  .brand-mark {
    width: 24px;
    height: 24px;
    background: var(--ink-primary);
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .brand-bar {
    display: block;
    width: 12px;
    height: 4px;
    background: var(--ink-inverse);
    border-radius: 1px;
  }
  .brand-name {
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.005em;
  }

  .content-nav {
    display: flex;
    gap: var(--space-4);
    font-size: 14px;
  }
  .content-nav a {
    color: var(--ink-secondary);
    text-decoration: none;
    transition: color 120ms ease;
  }
  .content-nav a:hover {
    color: var(--ink-primary);
  }

  .content-main {
    flex: 1;
    padding: var(--space-5);
    max-width: 720px;
    width: 100%;
    margin: 0 auto;
  }
  @media (min-width: 768px) {
    .content-main { padding: var(--space-6); }
  }

  /* Prose styles applied via :global so child pages don't need to scope */
  .content-main :global(h1) {
    font-size: 32px;
    font-weight: 500;
    letter-spacing: -0.015em;
    line-height: 1.15;
    margin-bottom: var(--space-4);
  }
  @media (min-width: 768px) {
    .content-main :global(h1) { font-size: 40px; }
  }
  .content-main :global(.lede) {
    font-size: 18px;
    color: var(--ink-secondary);
    line-height: 1.5;
    margin-bottom: var(--space-8);
    max-width: 600px;
  }
  .content-main :global(h2) {
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.005em;
    margin-top: var(--space-8);
    margin-bottom: var(--space-3);
  }
  .content-main :global(h3) {
    font-size: 17px;
    font-weight: 500;
    margin-top: var(--space-5);
    margin-bottom: var(--space-2);
  }
  .content-main :global(p) {
    font-size: 16px;
    line-height: 1.65;
    color: var(--ink-primary);
    margin-bottom: var(--space-3);
    max-width: 640px;
  }
  .content-main :global(p.muted) { color: var(--ink-secondary); }
  .content-main :global(ul),
  .content-main :global(ol) {
    margin: 0 0 var(--space-3) var(--space-5);
    max-width: 640px;
  }
  .content-main :global(li) {
    font-size: 16px;
    line-height: 1.65;
    margin-bottom: var(--space-1);
  }
  .content-main :global(strong) { font-weight: 500; }
  .content-main :global(code),
  .content-main :global(kbd) {
    font-family: var(--font-mono);
    font-size: 0.9em;
    background: var(--border-hairline);
    padding: 1px 6px;
    border-radius: 4px;
    border: 0.5px solid var(--border-emphasis);
  }
  .content-main :global(a) {
    color: var(--ink-primary);
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-thickness: 1px;
  }
  .content-main :global(.faq-q) {
    font-size: 17px;
    font-weight: 500;
    margin-top: var(--space-5);
    margin-bottom: var(--space-2);
  }
  .content-main :global(.faq-a) {
    color: var(--ink-secondary);
  }

  .content-footer {
    border-top: 1px solid var(--border-hairline);
    padding: var(--space-6) var(--space-5);
    margin: var(--space-8) auto 0;
    max-width: 720px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    text-align: center;
  }
  @media (min-width: 768px) {
    .content-footer { padding: var(--space-6); }
  }
  .cta-back {
    display: inline-block;
    padding: 12px 20px;
    background: var(--ink-primary);
    color: var(--ink-inverse);
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    margin-bottom: var(--space-2);
    transition: transform 80ms ease;
  }
  .cta-back:active { transform: scale(0.96); }
  .content-formats {
    font-size: 12px;
    color: var(--ink-tertiary);
  }
  .content-promise {
    font-size: 13px;
    color: var(--ink-secondary);
  }
  .content-footer-links {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 13px;
  }
  .content-footer-links a {
    color: var(--ink-secondary);
    text-decoration: none;
  }
  .content-footer-links a:hover {
    color: var(--ink-primary);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .content-footer-links span {
    color: var(--ink-disabled);
  }
</style>
