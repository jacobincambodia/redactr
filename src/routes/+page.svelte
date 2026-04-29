<script>
  import { onMount } from 'svelte';
  import { app } from '$lib/state.svelte.js';
  import { REDACT_TOOLS, MARKUP_TOOLS, MARKUP_COLORS } from '$lib/tools.js';
  import { drawAnnotation, exportPng, getCanvasPos, normalizeRect } from '$lib/redact.js';

  let canvasEl;
  let fileInputEl;
  let textInputEl;

  let drawing = $state(false);
  let dragStart = $state(null);
  let dragCurrent = $state(null);
  let textPlacement = $state(null); // { x, y, value } in canvas coords
  let errorMessage = $state('');
  let confirmingClear = $state(false);
  let isDark = $state(false);

  const allTools = [...REDACT_TOOLS, ...MARKUP_TOOLS];
  const activeTool = $derived(allTools.find((t) => t.id === app.tool));

  function getSettingValue() {
    if (!activeTool?.settingKey) return null;
    const k = activeTool.settingKey;
    if (k === 'blockSize') return app.blockSize;
    if (k === 'radius') return app.blurRadius;
    if (k === 'strokeWidth') return app.strokeWidth;
    if (k === 'fontSize') return app.fontSize;
    return null;
  }
  function setSettingValue(v) {
    const k = activeTool.settingKey;
    if (k === 'blockSize') app.blockSize = v;
    else if (k === 'radius') app.blurRadius = v;
    else if (k === 'strokeWidth') app.strokeWidth = v;
    else if (k === 'fontSize') app.fontSize = v;
  }

  function evalDark() {
    const e = document.documentElement.getAttribute('data-theme');
    if (e === 'dark') isDark = true;
    else if (e === 'light') isDark = false;
    else isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  onMount(() => {
    evalDark();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', evalDark);

    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) loadFile(file);
          break;
        }
      }
    };
    document.addEventListener('paste', onPaste);

    const onKey = (e) => {
      // Don't intercept while typing into the inline text input
      if (e.target instanceof HTMLInputElement && e.target !== textInputEl) return;
      if (textPlacement) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (app.annotations.length) app.undoLast();
      } else if (e.key === 'Escape') {
        if (drawing) {
          drawing = false;
          dragStart = null;
          dragCurrent = null;
        }
        confirmingClear = false;
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      mq.removeEventListener('change', evalDark);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('keydown', onKey);
    };
  });

  // Re-render the canvas whenever the image, annotations, or theme change
  $effect(() => {
    if (!app.image || !canvasEl) return;
    isDark; // dependency for text outline color
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.drawImage(app.image.element, 0, 0);
    for (const ann of app.annotations) {
      drawAnnotation(ctx, ann, app.image.element, isDark);
    }
  });

  function showError(msg) {
    errorMessage = msg;
    const captured = msg;
    setTimeout(() => {
      if (errorMessage === captured) errorMessage = '';
    }, 4000);
  }

  function loadFile(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
      showError('Unsupported format — JPEG, PNG, GIF, or WebP only');
      return;
    }
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      app.setImage({
        src,
        name: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
        element: img,
      });
      if (img.naturalWidth > 4096 || img.naturalHeight > 4096) {
        showError('Large image — operations may be slow');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      showError("Couldn't read that image. Try a different file.");
    };
    img.src = src;
  }

  function onFilePick(e) {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = '';
  }

  function onDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) loadFile(file);
  }
  function onDragOver(e) {
    if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
  }

  function onPointerDown(e) {
    if (!app.image) return;
    e.target.setPointerCapture(e.pointerId);
    const pos = getCanvasPos(e, canvasEl);

    if (app.tool === 'text') {
      textPlacement = { x: pos.x, y: pos.y, value: '' };
      setTimeout(() => textInputEl?.focus(), 0);
      return;
    }

    drawing = true;
    dragStart = pos;
    dragCurrent = pos;
  }
  function onPointerMove(e) {
    if (!drawing) return;
    dragCurrent = getCanvasPos(e, canvasEl);
  }
  function onPointerUp(e) {
    if (!drawing) return;
    drawing = false;
    const end = getCanvasPos(e, canvasEl);
    const rawW = end.x - dragStart.x;
    const rawH = end.y - dragStart.y;

    if (Math.abs(rawW) < 4 && Math.abs(rawH) < 4) {
      dragStart = null;
      dragCurrent = null;
      return;
    }

    let ann = null;
    if (app.tool === 'arrow') {
      // Arrows use raw direction, not a normalized rect
      ann = {
        tool: 'arrow',
        x: dragStart.x,
        y: dragStart.y,
        w: rawW,
        h: rawH,
        color: app.color,
        strokeWidth: app.strokeWidth,
      };
    } else {
      const r = normalizeRect(dragStart.x, dragStart.y, rawW, rawH);
      const base = { tool: app.tool, ...r };
      if (app.tool === 'pixelate') ann = { ...base, blockSize: app.blockSize };
      else if (app.tool === 'blur') ann = { ...base, radius: app.blurRadius };
      else if (app.tool === 'blackbox') ann = base;
      else if (app.tool === 'rect')
        ann = { ...base, color: app.color, strokeWidth: app.strokeWidth };
    }

    if (ann) app.addAnnotation(ann);
    dragStart = null;
    dragCurrent = null;
  }

  function commitText() {
    if (!textPlacement) return;
    const t = textPlacement.value.trim();
    if (t) {
      app.addAnnotation({
        tool: 'text',
        x: textPlacement.x,
        y: textPlacement.y,
        w: 0,
        h: 0,
        text: t,
        color: app.color,
        fontSize: app.fontSize,
      });
    }
    textPlacement = null;
  }
  function onTextKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitText();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      textPlacement = null;
    }
  }

  function doExport() {
    if (!app.image) return;
    const baseName = app.image.name.replace(/\.[^.]+$/, '');
    exportPng(app.image.element, app.annotations, `${baseName}-redacted.png`);
  }

  function toggleTheme() {
    const cur = app.theme;
    const next = cur === 'system' ? 'light' : cur === 'light' ? 'dark' : 'system';
    app.setTheme(next);
    evalDark();
  }

  function clearAll() {
    app.clearAll();
    confirmingClear = false;
  }

  // Selection rectangle preview, in display coordinates relative to .canvas-frame
  const selectionBox = $derived.by(() => {
    if (!drawing || !dragStart || !dragCurrent || !canvasEl) return null;
    const rect = canvasEl.getBoundingClientRect();
    const parent = canvasEl.parentElement?.getBoundingClientRect();
    if (!parent) return null;
    const sx = rect.width / canvasEl.width;
    const sy = rect.height / canvasEl.height;
    const offX = rect.left - parent.left;
    const offY = rect.top - parent.top;
    const x1 = Math.min(dragStart.x, dragCurrent.x);
    const y1 = Math.min(dragStart.y, dragCurrent.y);
    return {
      x: x1 * sx + offX,
      y: y1 * sy + offY,
      w: Math.abs(dragCurrent.x - dragStart.x) * sx,
      h: Math.abs(dragCurrent.y - dragStart.y) * sy,
    };
  });

  // Inline text input position, in display coordinates
  const textBox = $derived.by(() => {
    if (!textPlacement || !canvasEl) return null;
    const rect = canvasEl.getBoundingClientRect();
    const parent = canvasEl.parentElement?.getBoundingClientRect();
    if (!parent) return null;
    const sx = rect.width / canvasEl.width;
    const sy = rect.height / canvasEl.height;
    return {
      x: textPlacement.x * sx + (rect.left - parent.left),
      y: textPlacement.y * sy + (rect.top - parent.top),
      fontSize: app.fontSize * sy,
    };
  });
</script>

<main class="app" ondragover={onDragOver} ondrop={onDrop}>
  {#if !app.image}
    <!-- Empty state -->
    <div class="empty">
      <div class="logo" aria-hidden="true">
        <span class="logo-bar"></span>
      </div>
      <h1 class="empty-title">Redactr</h1>
      <p class="empty-subtitle">
        Black box, pixelate, blur. Plus arrows, text, shapes. Stays in your browser.
      </p>
      <button class="cta" onclick={() => fileInputEl.click()}>Choose image</button>
      <p class="hint">Or paste · Or drop</p>
    </div>
  {:else}
    <!-- Editor -->
    <div class="editor">
      <header class="topbar">
        <button class="file-label glass" onclick={() => fileInputEl.click()} title="Choose another image">
          <span class="file-icon" aria-hidden="true"></span>
          <span class="file-name">{app.image.name}</span>
          <span class="file-dims mono">{app.image.width}×{app.image.height}</span>
        </button>

        <div class="actions">
          <button
            class="action-pill glass"
            disabled={app.annotations.length === 0}
            onclick={() => app.undoLast()}
            aria-label="Undo last annotation"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 8h7a3 3 0 0 1 0 6H7" />
              <path d="M5.5 5.5 3 8l2.5 2.5" />
            </svg>
            <span>Undo</span>
          </button>

          <button
            class="action-pill glass"
            disabled={app.annotations.length === 0}
            onclick={() => (confirmingClear = true)}
            aria-label="Clear all annotations"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
            <span>Clear</span>
          </button>

          <button class="action-pill icon-only glass" onclick={toggleTheme} aria-label="Toggle theme ({app.theme})" title="Theme: {app.theme}">
            {#if app.theme === 'system'}
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="3" width="12" height="9" rx="1.5" />
                <path d="M6 14h4" />
              </svg>
            {:else if app.theme === 'light'}
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="8" cy="8" r="3" />
                <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4" />
              </svg>
            {:else}
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M11.5 9.5A5.5 5.5 0 0 1 6.5 1c-.4 0-.8 0-1.2.1A6.5 6.5 0 1 0 14.4 11a5.5 5.5 0 0 1-2.9-1.5z" />
              </svg>
            {/if}
          </button>

          <button class="export-btn" onclick={doExport}>Export</button>
        </div>
      </header>

      <div class="canvas-surface">
        <div class="canvas-frame">
          <canvas
            bind:this={canvasEl}
            width={app.image.width}
            height={app.image.height}
            onpointerdown={onPointerDown}
            onpointermove={onPointerMove}
            onpointerup={onPointerUp}
            onpointercancel={onPointerUp}
            class="canvas"
            class:cursor-cross={app.image && app.tool !== 'text'}
            class:cursor-text={app.image && app.tool === 'text'}
            role="img"
            aria-label="Image being redacted: {app.image.name}"
          ></canvas>

          {#if selectionBox}
            <div
              class="selection-preview"
              style="left:{selectionBox.x}px; top:{selectionBox.y}px; width:{selectionBox.w}px; height:{selectionBox.h}px;"
            ></div>
          {/if}

          {#if textPlacement && textBox}
            <input
              bind:this={textInputEl}
              class="text-input"
              type="text"
              bind:value={textPlacement.value}
              onkeydown={onTextKey}
              onblur={commitText}
              placeholder="Type…"
              style="left:{textBox.x}px; top:{textBox.y}px; color:{app.color}; font-size:{textBox.fontSize}px;"
            />
          {/if}
        </div>
      </div>

      <div class="toolbar-area">
        {#if confirmingClear}
          <div class="confirm-strip glass" role="alertdialog">
            <span>Clear all annotations?</span>
            <button class="confirm-yes" onclick={clearAll}>Clear</button>
            <button class="confirm-no" onclick={() => (confirmingClear = false)}>Cancel</button>
          </div>
        {:else if activeTool && (activeTool.settingKey || activeTool.hasColor)}
          <div class="settings-strip glass">
            {#if activeTool.hasColor}
              <div class="swatches">
                {#each MARKUP_COLORS as c (c.id)}
                  <button
                    class="swatch"
                    class:active={app.color === c.value}
                    class:swatch-white={c.id === 'white'}
                    style="background:{c.value};"
                    onclick={() => (app.color = c.value)}
                    aria-label="Color {c.id}"
                    aria-pressed={app.color === c.value}
                  ></button>
                {/each}
              </div>
            {/if}
            {#if activeTool.hasColor && activeTool.settingKey}
              <div class="strip-divider"></div>
            {/if}
            {#if activeTool.settingKey}
              <span class="meta-label">{activeTool.metaLabel}</span>
              <input
                type="range"
                class="strip-slider"
                min={activeTool.settingMin}
                max={activeTool.settingMax}
                value={getSettingValue()}
                oninput={(e) => setSettingValue(parseInt(e.currentTarget.value))}
                aria-label="{activeTool.metaLabel} {getSettingValue()} {activeTool.settingUnit}"
              />
              <span class="strip-value mono">{getSettingValue()} {activeTool.settingUnit}</span>
            {/if}
          </div>
        {/if}

        <div class="toolbar glass" role="toolbar" aria-label="Editing tools">
          <div class="tool-group">
            {#each REDACT_TOOLS as t (t.id)}
              <button
                class="tool-btn"
                class:active={app.tool === t.id}
                onclick={() => (app.tool = t.id)}
                aria-label={t.label}
                aria-pressed={app.tool === t.id}
                title={t.label}
              >
                {#if t.id === 'blackbox'}
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                    <rect x="3" y="6" width="10" height="4" rx="0.5" fill="currentColor" />
                  </svg>
                {:else if t.id === 'pixelate'}
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor">
                    <rect x="2" y="2" width="4" height="4" opacity="0.85" />
                    <rect x="6" y="2" width="4" height="4" opacity="0.55" />
                    <rect x="10" y="2" width="4" height="4" opacity="0.7" />
                    <rect x="2" y="6" width="4" height="4" opacity="0.6" />
                    <rect x="6" y="6" width="4" height="4" opacity="0.95" />
                    <rect x="10" y="6" width="4" height="4" opacity="0.4" />
                    <rect x="2" y="10" width="4" height="4" opacity="0.75" />
                    <rect x="6" y="10" width="4" height="4" opacity="0.5" />
                    <rect x="10" y="10" width="4" height="4" opacity="0.85" />
                  </svg>
                {:else if t.id === 'blur'}
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="8" cy="8" r="2" opacity="1" />
                    <circle cx="8" cy="8" r="4.5" opacity="0.5" />
                    <circle cx="8" cy="8" r="7" opacity="0.2" />
                  </svg>
                {/if}
              </button>
            {/each}
          </div>

          <div class="group-divider"></div>

          <div class="tool-group">
            {#each MARKUP_TOOLS as t (t.id)}
              <button
                class="tool-btn"
                class:active={app.tool === t.id}
                onclick={() => (app.tool = t.id)}
                aria-label={t.label}
                aria-pressed={app.tool === t.id}
                title={t.label}
              >
                {#if t.id === 'rect'}
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="2.5" y="3.5" width="11" height="9" rx="0.5" />
                  </svg>
                {:else if t.id === 'arrow'}
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 13L13 3" />
                    <path d="M8 3h5v5" />
                  </svg>
                {:else if t.id === 'text'}
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                    <path d="M3 4h10M8 4v9M5.5 13h5" />
                  </svg>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if errorMessage}
    <div class="error-toast" role="status">{errorMessage}</div>
  {/if}

  <input
    type="file"
    bind:this={fileInputEl}
    accept="image/jpeg,image/png,image/gif,image/webp"
    onchange={onFilePick}
    hidden
  />
</main>

<style>
  .app {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background-color: var(--surface-page);
    background-image: radial-gradient(circle, var(--surface-dot) 1px, transparent 1px);
    background-size: 16px 16px;
    background-position: 0 0;
  }

  /* ───────── Empty state ───────── */
  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-5);
    text-align: center;
  }
  .logo {
    width: 48px;
    height: 48px;
    background: var(--ink-primary);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-6);
  }
  .logo-bar {
    display: block;
    width: 24px;
    height: 8px;
    background: var(--ink-inverse);
    border-radius: 1px;
  }
  .empty-title {
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.01em;
    margin-bottom: var(--space-3);
  }
  .empty-subtitle {
    font-size: 14px;
    color: var(--ink-secondary);
    line-height: 1.5;
    max-width: 320px;
    margin-bottom: var(--space-6);
  }
  .cta {
    width: 100%;
    max-width: 280px;
    height: 48px;
    background: var(--ink-primary);
    color: var(--ink-inverse);
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    transition: transform 80ms ease;
  }
  .cta:active { transform: scale(0.96); }
  .hint {
    margin-top: var(--space-3);
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-tertiary);
  }

  /* ───────── Editor layout ───────── */
  .editor {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
  }
  .topbar {
    position: absolute;
    top: var(--space-4);
    left: var(--space-4);
    right: var(--space-4);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-3);
    z-index: 10;
    pointer-events: none;
  }
  .topbar > * { pointer-events: auto; }

  @media (min-width: 768px) {
    .topbar { top: var(--space-5); left: var(--space-5); right: var(--space-5); }
  }

  .file-label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 8px 12px;
    border-radius: var(--radius-xl);
    font-size: 12px;
    color: var(--ink-primary);
    box-shadow: var(--shadow-toolbar);
    max-width: min(320px, 60vw);
  }
  .file-icon {
    width: 12px;
    height: 12px;
    background: var(--ink-primary);
    border-radius: 2px;
    flex-shrink: 0;
  }
  .file-name {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .file-dims {
    color: var(--ink-tertiary);
    font-size: 11px;
    flex-shrink: 0;
  }

  .actions {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .action-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: var(--radius-xl);
    font-size: 13px;
    color: var(--ink-primary);
    box-shadow: var(--shadow-toolbar);
    transition: background 120ms ease, transform 80ms ease;
  }
  .action-pill.icon-only { padding: 8px; }
  .action-pill:hover:not(:disabled) { background: var(--surface-elevated); }
  .action-pill:active:not(:disabled) { transform: scale(0.96); }
  .action-pill:disabled {
    color: var(--ink-disabled);
    opacity: 0.6;
  }

  .export-btn {
    height: 32px;
    padding: 0 14px;
    background: var(--ink-primary);
    color: var(--ink-inverse);
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    transition: transform 80ms ease;
  }
  .export-btn:active { transform: scale(0.96); }

  /* ───────── Canvas surface ───────── */
  .canvas-surface {
    flex: 1;
    min-height: 0;
    background-color: var(--surface-canvas);
    background-image: radial-gradient(circle, var(--surface-dot) 1px, transparent 1px);
    background-size: 16px 16px;
    background-position: 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80px var(--space-5) 140px;
    overflow: hidden;
    transition: background-color 200ms ease;
  }
  @media (min-width: 768px) {
    .canvas-surface { padding: 96px var(--space-6) 160px; }
  }

  .canvas-frame {
    position: relative;
    max-width: 100%;
    max-height: 100%;
    display: inline-block;
  }
  .canvas {
    max-width: 100%;
    max-height: calc(100dvh - 220px);
    width: auto;
    height: auto;
    border-radius: var(--radius-image);
    box-shadow: var(--shadow-canvas);
    background: #ffffff;
    touch-action: none;
    user-select: none;
  }
  .cursor-cross { cursor: crosshair; }
  .cursor-text { cursor: text; }

  .selection-preview {
    position: absolute;
    border: 1.5px solid var(--accent-canvas-selection);
    background: var(--accent-canvas-selection-fill);
    border-radius: 2px;
    pointer-events: none;
  }

  .text-input {
    position: absolute;
    background: transparent;
    border: 1px dashed var(--accent-canvas-selection);
    padding: 0 4px;
    font-family: var(--font-sans);
    font-weight: 500;
    line-height: 1;
    outline: none;
    min-width: 80px;
  }

  /* ───────── Toolbar area ───────── */
  .toolbar-area {
    position: absolute;
    bottom: var(--space-4);
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-4);
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 10;
    pointer-events: none;
  }
  .toolbar-area > * { pointer-events: auto; }
  @media (min-width: 768px) {
    .toolbar-area { bottom: var(--space-5); }
  }

  .settings-strip,
  .confirm-strip {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: 8px 12px;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-toolbar);
    max-width: 100%;
  }
  .swatches {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .swatch {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid var(--border-hairline);
    padding: 0;
    transition: transform 100ms ease, border-color 120ms ease;
  }
  .swatch:hover { transform: scale(1.1); }
  .swatch.active { border-color: var(--ink-primary); }
  .swatch.swatch-white {
    box-shadow: inset 0 0 0 1px var(--border-emphasis);
  }
  .strip-divider {
    width: 1px;
    height: 22px;
    background: var(--border-hairline);
  }
  .strip-slider {
    flex: 1;
    min-width: 100px;
    max-width: 180px;
    accent-color: var(--ink-primary);
  }
  .strip-value {
    font-size: 12px;
    color: var(--ink-primary);
    min-width: 56px;
    text-align: right;
  }

  .confirm-strip { font-size: 13px; }
  .confirm-yes,
  .confirm-no {
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
  }
  .confirm-yes { background: var(--ink-primary); color: var(--ink-inverse); }
  .confirm-no { color: var(--ink-secondary); }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 6px;
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-toolbar);
  }
  .tool-group {
    display: flex;
    gap: 2px;
  }
  .group-divider {
    width: 1px;
    height: 22px;
    background: var(--border-hairline);
    margin: 0 4px;
  }
  .tool-btn {
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-lg);
    color: var(--ink-primary);
    transition: background 120ms ease, color 120ms ease, transform 80ms ease;
  }
  .tool-btn:hover:not(.active) { background: var(--border-hairline); }
  .tool-btn:active { transform: scale(0.96); }
  .tool-btn.active {
    background: var(--ink-primary);
    color: var(--ink-inverse);
  }

  /* ───────── Error toast ───────── */
  .error-toast {
    position: fixed;
    top: var(--space-4);
    left: 50%;
    transform: translateX(-50%);
    background: var(--ink-primary);
    color: var(--ink-inverse);
    padding: 10px 16px;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 500;
    box-shadow: var(--shadow-toolbar);
    z-index: 100;
    max-width: 90vw;
  }

  /* Tighten action labels on narrow phones */
  @media (max-width: 480px) {
    .action-pill span { display: none; }
    .action-pill { padding: 8px; }
    .file-dims { display: none; }
    .file-label { max-width: 45vw; padding: 8px 10px; }
    .actions { gap: 6px; }
    .export-btn { padding: 0 10px; font-size: 13px; }
  }
</style>
