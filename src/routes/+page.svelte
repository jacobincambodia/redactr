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

  // Selection / direct manipulation
  let selectedId = $state(null);
  // interaction: null | { kind: 'moving', id, offset } | { kind: 'resizing', id, handle, original }
  let interaction = $state(null);
  // Hover state (for cursor feedback)
  let hoverHandle = $state(null);
  let hoverBody = $state(false);

  const allTools = [...REDACT_TOOLS, ...MARKUP_TOOLS];
  const selectedAnn = $derived(app.annotations.find((a) => a.id === selectedId) ?? null);
  // Settings strip mirrors the selected annotation when one is selected
  const displayedToolId = $derived(selectedAnn?.tool ?? app.tool);
  const activeTool = $derived(allTools.find((t) => t.id === displayedToolId));
  const isRedactActive = $derived(REDACT_TOOLS.some((t) => t.id === displayedToolId));

  // Map tool's settingKey to the annotation field name (which differs in one case)
  function annFieldFor(settingKey) {
    return settingKey === 'radius' ? 'radius'
      : settingKey === 'blockSize' ? 'blockSize'
      : settingKey === 'strokeWidth' ? 'strokeWidth'
      : settingKey === 'fontSize' ? 'fontSize'
      : null;
  }
  function getSettingValue() {
    if (!activeTool?.settingKey) return null;
    const k = activeTool.settingKey;
    if (selectedAnn) {
      const f = annFieldFor(k);
      return f ? selectedAnn[f] : null;
    }
    if (k === 'blockSize') return app.blockSize;
    if (k === 'radius') return app.blurRadius;
    if (k === 'strokeWidth') return app.strokeWidth;
    if (k === 'fontSize') return app.fontSize;
    return null;
  }
  function setSettingValue(v) {
    const k = activeTool.settingKey;
    if (selectedAnn) {
      const f = annFieldFor(k);
      if (f) app.updateAnnotation(selectedAnn.id, { [f]: v });
      return;
    }
    if (k === 'blockSize') app.blockSize = v;
    else if (k === 'radius') app.blurRadius = v;
    else if (k === 'strokeWidth') app.strokeWidth = v;
    else if (k === 'fontSize') app.fontSize = v;
  }

  // Color / shape / text-style getters and setters that route to selected ann or defaults
  function getActiveColor() { return selectedAnn?.color ?? app.color; }
  function setActiveColor(v) {
    if (selectedAnn) app.updateAnnotation(selectedAnn.id, { color: v });
    else app.color = v;
  }
  function getActiveShape() { return selectedAnn?.shape ?? app.redactShape; }
  function setActiveShape(v) {
    if (selectedAnn) app.updateAnnotation(selectedAnn.id, { shape: v });
    else app.redactShape = v;
  }
  function getActiveTextFlag(flag) { return selectedAnn?.[flag] ?? app[`text${flag[0].toUpperCase()}${flag.slice(1)}`]; }
  function setActiveTextFlag(flag, v) {
    if (selectedAnn) app.updateAnnotation(selectedAnn.id, { [flag]: v });
    else app[`text${flag[0].toUpperCase()}${flag.slice(1)}`] = v;
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
        if (app.annotations.length) {
          // Undo: clear selection if it points at the about-to-be-removed annotation
          const last = app.annotations[app.annotations.length - 1];
          if (selectedId === last?.id) selectedId = null;
          app.undoLast();
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        app.deleteAnnotation(selectedId);
        selectedId = null;
      } else if (e.key === 'Escape') {
        if (drawing) {
          drawing = false;
          dragStart = null;
          dragCurrent = null;
        }
        if (interaction) interaction = null;
        if (selectedId) selectedId = null;
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

  // Tools whose in-progress draw is rendered live on the canvas (not as a blue preview rect)
  const LIVE_PREVIEW_TOOLS = new Set(['arrow', 'rect', 'blackbox']);

  function previewAnnotation() {
    if (!drawing || !dragStart || !dragCurrent) return null;
    const t = app.tool;
    if (!LIVE_PREVIEW_TOOLS.has(t)) return null;
    if (t === 'arrow') {
      return {
        tool: 'arrow',
        x: dragStart.x, y: dragStart.y,
        w: dragCurrent.x - dragStart.x, h: dragCurrent.y - dragStart.y,
        color: app.color,
        strokeWidth: app.strokeWidth,
      };
    }
    if (t === 'rect') {
      const r = normalizeRect(dragStart.x, dragStart.y, dragCurrent.x - dragStart.x, dragCurrent.y - dragStart.y);
      return { tool: 'rect', ...r, color: app.color, strokeWidth: app.strokeWidth };
    }
    // blackbox: only live-preview rect shape (ellipse falls back to blue ring)
    if (t === 'blackbox' && app.redactShape !== 'ellipse') {
      const r = normalizeRect(dragStart.x, dragStart.y, dragCurrent.x - dragStart.x, dragCurrent.y - dragStart.y);
      return { tool: 'blackbox', ...r, shape: 'rect' };
    }
    return null;
  }

  // Re-render the canvas whenever the image, annotations, or theme change
  $effect(() => {
    if (!app.image || !canvasEl) return;
    isDark;
    drawing; dragStart; dragCurrent; // dependencies for live preview
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.drawImage(app.image.element, 0, 0);
    for (const ann of app.annotations) {
      drawAnnotation(ctx, ann, app.image.element, isDark);
    }
    const preview = previewAnnotation();
    if (preview) drawAnnotation(ctx, preview, app.image.element, isDark);
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

  // Hit-test helpers (all in image-pixel coords)
  function pointToSegment(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }

  function hitsAnnotation(a, pos, slop = 0) {
    if (a.tool === 'arrow') {
      const dist = pointToSegment(pos, { x: a.x, y: a.y }, { x: a.x + a.w, y: a.y + a.h });
      return dist <= Math.max((a.strokeWidth || 4) + 8, 14) + slop;
    }
    if (a.tool === 'text') {
      // Approximate bounds from font metrics
      const charW = (a.fontSize || 24) * 0.6;
      const w = (a.text || '').length * charW;
      const h = (a.fontSize || 24) * 1.2;
      return pos.x >= a.x - slop && pos.x <= a.x + w + slop && pos.y >= a.y - slop && pos.y <= a.y + h + slop;
    }
    const x = Math.min(a.x, a.x + a.w) - slop;
    const y = Math.min(a.y, a.y + a.h) - slop;
    const w = Math.abs(a.w) + 2 * slop;
    const h = Math.abs(a.h) + 2 * slop;
    if (a.shape === 'ellipse') {
      const cx = a.x + a.w / 2;
      const cy = a.y + a.h / 2;
      const rx = Math.abs(a.w) / 2 + slop;
      const ry = Math.abs(a.h) / 2 + slop;
      if (rx === 0 || ry === 0) return false;
      const ndx = (pos.x - cx) / rx;
      const ndy = (pos.y - cy) / ry;
      return ndx * ndx + ndy * ndy <= 1;
    }
    return pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h;
  }

  function hitTest(pos) {
    // Top-most annotation wins
    for (let i = app.annotations.length - 1; i >= 0; i--) {
      if (hitsAnnotation(app.annotations[i], pos)) return app.annotations[i];
    }
    return null;
  }

  // Handle positions for the selected annotation (in image coords).
  // For rect-bounded tools: 4 corners (TL, TR, BR, BL).
  // For arrow: 2 endpoints (start, end).
  // For text: none (move-only; size via slider).
  function textBoundsFor(a) {
    const charW = (a.fontSize || 24) * 0.6;
    const w = (a.text || '').length * charW;
    const h = (a.fontSize || 24) * 1.2;
    return { w, h };
  }

  function handlesFor(a) {
    if (!a) return [];
    if (a.tool === 'arrow') {
      return [
        { name: 'start', x: a.x, y: a.y },
        { name: 'end', x: a.x + a.w, y: a.y + a.h },
      ];
    }
    if (a.tool === 'text') {
      const { w, h } = textBoundsFor(a);
      return [
        { name: 'tl', x: a.x, y: a.y },
        { name: 'tr', x: a.x + w, y: a.y },
        { name: 'br', x: a.x + w, y: a.y + h },
        { name: 'bl', x: a.x, y: a.y + h },
      ];
    }
    const x1 = a.x, y1 = a.y, x2 = a.x + a.w, y2 = a.y + a.h;
    return [
      { name: 'tl', x: x1, y: y1 },
      { name: 'tr', x: x2, y: y1 },
      { name: 'br', x: x2, y: y2 },
      { name: 'bl', x: x1, y: y2 },
    ];
  }

  // Hit-test against the selected annotation's handles. Threshold is in image coords.
  function hitHandle(pos, a) {
    if (!a || !canvasEl) return null;
    const rect = canvasEl.getBoundingClientRect();
    // ~12px display radius → convert to image coords
    const slop = 12 * (canvasEl.width / rect.width);
    const handles = handlesFor(a);
    for (const h of handles) {
      if (Math.hypot(pos.x - h.x, pos.y - h.y) <= slop) return h.name;
    }
    return null;
  }

  function applyResize(ann, handle, original, pos) {
    let patch;
    if (ann.tool === 'arrow') {
      // Endpoints; w/h are deltas
      if (handle === 'start') {
        const newEndX = original.x + original.w;
        const newEndY = original.y + original.h;
        patch = { x: pos.x, y: pos.y, w: newEndX - pos.x, h: newEndY - pos.y };
      } else {
        patch = { w: pos.x - original.x, h: pos.y - original.y };
      }
    } else if (ann.tool === 'text') {
      // Uniform-scale text from the opposite corner
      const { w: origW, h: origH } = textBoundsFor(original);
      let anchorX, anchorY;
      if (handle === 'tl') { anchorX = original.x + origW; anchorY = original.y + origH; }
      else if (handle === 'tr') { anchorX = original.x; anchorY = original.y + origH; }
      else if (handle === 'br') { anchorX = original.x; anchorY = original.y; }
      else { anchorX = original.x + origW; anchorY = original.y; } // bl
      const newH = Math.abs(pos.y - anchorY);
      if (newH < 4) return;
      const scale = newH / origH;
      const newFontSize = Math.max(8, Math.min(400, original.fontSize * scale));
      const newWForBounds = (original.text || '').length * newFontSize * 0.6;
      const newHForBounds = newFontSize * 1.2;
      let newX, newY;
      if (handle === 'tl') { newX = anchorX - newWForBounds; newY = anchorY - newHForBounds; }
      else if (handle === 'tr') { newX = anchorX; newY = anchorY - newHForBounds; }
      else if (handle === 'br') { newX = anchorX; newY = anchorY; }
      else { newX = anchorX - newWForBounds; newY = anchorY; }
      patch = { x: newX, y: newY, fontSize: newFontSize };
    } else {
      // Rect-bounded: use opposite corner as anchor; allow flipping
      const anchorX = handle.includes('l') ? original.x + original.w : original.x;
      const anchorY = handle.includes('t') ? original.y + original.h : original.y;
      const x = Math.min(anchorX, pos.x);
      const y = Math.min(anchorY, pos.y);
      const w = Math.abs(pos.x - anchorX);
      const h = Math.abs(pos.y - anchorY);
      patch = { x, y, w, h };
    }
    app.updateAnnotation(ann.id, patch);
  }

  function updateHover(pos) {
    if (interaction || drawing || !selectedAnn) {
      hoverHandle = null;
      hoverBody = false;
      return;
    }
    hoverHandle = hitHandle(pos, selectedAnn);
    hoverBody = !hoverHandle && hitsAnnotation(selectedAnn, pos);
  }

  function resizeCursorFor(handle) {
    if (handle === 'tl' || handle === 'br') return 'nwse-resize';
    if (handle === 'tr' || handle === 'bl') return 'nesw-resize';
    if (handle === 'start' || handle === 'end') return 'crosshair';
    return 'default';
  }

  const canvasCursor = $derived.by(() => {
    if (interaction?.kind === 'moving') return 'grabbing';
    if (interaction?.kind === 'resizing') return resizeCursorFor(interaction.handle);
    if (drawing) return 'crosshair';
    if (textPlacement) return 'text';
    if (hoverHandle) return resizeCursorFor(hoverHandle);
    if (hoverBody) return 'grab';
    if (app.tool === 'text') return 'text';
    return 'crosshair';
  });

  function onPointerDown(e) {
    if (!app.image) return;
    // setPointerCapture throws NotFoundError for touch pointers on iOS Safari and
    // for synthesized events. The capture is a nice-to-have (it lets the drag
    // continue if the pointer leaves the canvas) but the drag itself works fine
    // without it. If we don't catch this, the rest of onPointerDown never runs
    // and the user's drag does nothing visible.
    try { canvasEl?.setPointerCapture?.(e.pointerId); } catch {}
    const pos = getCanvasPos(e, canvasEl);

    // 1. Resize handle on currently-selected annotation
    if (selectedAnn) {
      const h = hitHandle(pos, selectedAnn);
      if (h) {
        interaction = { kind: 'resizing', id: selectedAnn.id, handle: h, original: { ...selectedAnn } };
        return;
      }
      // Click on body of selected → start move (don't reselect)
      if (hitsAnnotation(selectedAnn, pos)) {
        interaction = { kind: 'moving', id: selectedAnn.id, offset: { x: pos.x - selectedAnn.x, y: pos.y - selectedAnn.y } };
        return;
      }
    }

    // For the text tool, clicks always place new text — never select an annotation
    // underneath. Lets you write labels on top of black boxes / blurs.
    if (app.tool === 'text') {
      selectedId = null;
      textPlacement = { x: pos.x, y: pos.y, value: '' };
      setTimeout(() => textInputEl?.focus(), 0);
      return;
    }

    // 2. Click on an existing annotation → select it (and prepare to move on drag)
    const hit = hitTest(pos);
    if (hit) {
      selectedId = hit.id;
      interaction = { kind: 'moving', id: hit.id, offset: { x: pos.x - hit.x, y: pos.y - hit.y } };
      return;
    }

    // 3. Empty space: deselect, start drawing
    selectedId = null;
    drawing = true;
    dragStart = pos;
    dragCurrent = pos;
  }

  function onPointerMove(e) {
    const pos = getCanvasPos(e, canvasEl);
    if (drawing) {
      dragCurrent = pos;
      return;
    }
    if (!interaction) {
      updateHover(pos);
      return;
    }
    if (interaction.kind === 'moving') {
      const a = app.annotations.find((x) => x.id === interaction.id);
      if (a) {
        app.updateAnnotation(a.id, {
          x: pos.x - interaction.offset.x,
          y: pos.y - interaction.offset.y,
        });
      }
    } else if (interaction.kind === 'resizing') {
      const a = app.annotations.find((x) => x.id === interaction.id);
      if (a) applyResize(a, interaction.handle, interaction.original, pos);
    }
  }

  function onPointerUp(e) {
    try { canvasEl?.releasePointerCapture?.(e.pointerId); } catch {}
    if (drawing) {
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
        if (app.tool === 'pixelate') ann = { ...base, blockSize: app.blockSize, shape: app.redactShape };
        else if (app.tool === 'blur') ann = { ...base, radius: app.blurRadius, shape: app.redactShape };
        else if (app.tool === 'blackbox') ann = { ...base, shape: app.redactShape };
        else if (app.tool === 'rect') ann = { ...base, color: app.color, strokeWidth: app.strokeWidth };
      }

      if (ann) {
        const id = app.addAnnotation(ann);
        selectedId = id;
      }
      dragStart = null;
      dragCurrent = null;
      return;
    }
    interaction = null;
  }

  function commitText() {
    if (!textPlacement) return;
    const t = textPlacement.value.trim();
    if (t) {
      const id = app.addAnnotation({
        tool: 'text',
        x: textPlacement.x,
        y: textPlacement.y,
        w: 0,
        h: 0,
        text: t,
        color: app.color,
        fontSize: app.fontSize,
        bold: app.textBold,
        italic: app.textItalic,
        underline: app.textUnderline,
      });
      selectedId = id;
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
    // Skip blue preview when the canvas already shows a live render of the in-progress tool
    if (previewAnnotation()) return null;
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

  // Convert image-pixel coords to overlay (canvas-frame relative) coords
  function imgToOverlay(x, y) {
    if (!canvasEl) return null;
    const rect = canvasEl.getBoundingClientRect();
    const parent = canvasEl.parentElement?.getBoundingClientRect();
    if (!parent) return null;
    const sx = rect.width / canvasEl.width;
    const sy = rect.height / canvasEl.height;
    return { x: x * sx + (rect.left - parent.left), y: y * sy + (rect.top - parent.top), sx, sy };
  }

  // Selection overlay rect (in display coords) for the selected annotation
  const selectionOverlay = $derived.by(() => {
    if (!selectedAnn || !canvasEl) return null;
    const a = selectedAnn;
    if (a.tool === 'arrow') {
      // Just expose endpoints; bounding shape isn't drawn for arrows
      const s = imgToOverlay(a.x, a.y);
      const e = imgToOverlay(a.x + a.w, a.y + a.h);
      if (!s || !e) return null;
      return { kind: 'arrow', start: s, end: e };
    }
    if (a.tool === 'text') {
      const s = imgToOverlay(a.x, a.y);
      if (!s) return null;
      const charW = (a.fontSize || 24) * 0.6;
      const w = (a.text || '').length * charW * s.sx;
      const h = (a.fontSize || 24) * 1.2 * s.sy;
      return { kind: 'rect', x: s.x, y: s.y, w, h, ellipse: false };
    }
    const x1 = Math.min(a.x, a.x + a.w);
    const y1 = Math.min(a.y, a.y + a.h);
    const x2 = Math.max(a.x, a.x + a.w);
    const y2 = Math.max(a.y, a.y + a.h);
    const tl = imgToOverlay(x1, y1);
    const br = imgToOverlay(x2, y2);
    if (!tl || !br) return null;
    return { kind: 'rect', x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y, ellipse: a.shape === 'ellipse' };
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

<svelte:head>
  <title>Redactr — Strong image redaction in your browser</title>
  <meta name="description" content="Black out, blur, or pixelate parts of an image, then mark it up with arrows and text. Runs entirely in your browser — no upload, no account, no tracking." />
  <meta property="og:title" content="Redactr — Strong image redaction in your browser" />
  <meta property="og:description" content="Black out, blur, or pixelate parts of an image, in your browser. No upload." />
</svelte:head>

<main class="app" ondragover={onDragOver} ondrop={onDrop}>
  {#if !app.image}
    <!-- Empty state -->
    <div class="empty">
      <div class="logo" aria-hidden="true">
        <span class="logo-bar"></span>
      </div>
      <h1 class="empty-title">Redactr</h1>
      <p class="empty-subtitle">
        Strong redaction. No upload. No account. Just your browser.
      </p>
      <button class="cta" onclick={() => fileInputEl.click()}>Choose image</button>
      <p class="hint">Or paste · Or drop</p>

      <footer class="empty-footer">
        <p class="empty-formats mono">JPEG · PNG · GIF · WebP</p>
        <p class="empty-promise">No upload, no tracking, no account. Everything happens on your device.</p>
        <nav class="empty-links" aria-label="About this tool">
          <a href="/about">about</a>
          <span aria-hidden="true">·</span>
          <a href="/features">features</a>
          <span aria-hidden="true">·</span>
          <a href="/guides">guides</a>
        </nav>
      </footer>
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
            onpointerleave={() => { hoverHandle = null; hoverBody = false; }}
            class="canvas"
            style:cursor={canvasCursor}
            role="img"
            aria-label="Image being redacted: {app.image.name}"
          ></canvas>

          {#if selectionBox}
            <div
              class="selection-preview"
              class:ellipse={isRedactActive && app.redactShape === 'ellipse'}
              style="left:{selectionBox.x}px; top:{selectionBox.y}px; width:{selectionBox.w}px; height:{selectionBox.h}px;"
            ></div>
          {/if}

          {#if selectionOverlay && selectionOverlay.kind === 'rect'}
            <div
              class="selection-mark"
              class:ellipse={selectionOverlay.ellipse}
              style="left:{selectionOverlay.x}px; top:{selectionOverlay.y}px; width:{selectionOverlay.w}px; height:{selectionOverlay.h}px;"
            ></div>
            {#each [['tl', 0, 0], ['tr', 1, 0], ['br', 1, 1], ['bl', 0, 1]] as [name, hx, hy] (name)}
              <div
                class="resize-handle"
                style="left:{selectionOverlay.x + selectionOverlay.w * hx}px; top:{selectionOverlay.y + selectionOverlay.h * hy}px;"
              ></div>
            {/each}
          {:else if selectionOverlay && selectionOverlay.kind === 'arrow'}
            <div class="resize-handle" style="left:{selectionOverlay.start.x}px; top:{selectionOverlay.start.y}px;"></div>
            <div class="resize-handle" style="left:{selectionOverlay.end.x}px; top:{selectionOverlay.end.y}px;"></div>
          {/if}

          {#if textPlacement && textBox}
            <input
              bind:this={textInputEl}
              class="text-input"
              class:bold={app.textBold}
              class:italic={app.textItalic}
              class:underline={app.textUnderline}
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
        {:else if activeTool && (activeTool.settingKey || activeTool.hasColor || isRedactActive)}
          <div class="settings-strip glass">
            {#if isRedactActive}
              <div class="shape-group">
                <button
                  class="style-btn"
                  class:active={getActiveShape() === 'rect'}
                  onclick={() => setActiveShape('rect')}
                  aria-label="Rectangle shape"
                  aria-pressed={getActiveShape() === 'rect'}
                  title="Rectangle"
                >
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75">
                    <rect x="2.5" y="3.5" width="11" height="9" rx="1" />
                  </svg>
                </button>
                <button
                  class="style-btn"
                  class:active={getActiveShape() === 'ellipse'}
                  onclick={() => setActiveShape('ellipse')}
                  aria-label="Ellipse shape"
                  aria-pressed={getActiveShape() === 'ellipse'}
                  title="Ellipse"
                >
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75">
                    <ellipse cx="8" cy="8" rx="5.5" ry="4.5" />
                  </svg>
                </button>
              </div>
              {#if activeTool.settingKey}<div class="strip-divider"></div>{/if}
            {/if}
            {#if activeTool.hasColor}
              <div class="swatches">
                {#each MARKUP_COLORS as c (c.id)}
                  <button
                    class="swatch"
                    class:active={getActiveColor() === c.value}
                    class:swatch-white={c.id === 'white'}
                    style="background:{c.value};"
                    onclick={() => setActiveColor(c.value)}
                    aria-label="Color {c.id}"
                    aria-pressed={getActiveColor() === c.value}
                  ></button>
                {/each}
              </div>
            {/if}
            {#if activeTool.hasColor && activeTool.settingKey}
              <div class="strip-divider"></div>
            {/if}
            {#if displayedToolId === 'text'}
              <div class="text-style-group">
                <button
                  class="style-btn"
                  class:active={getActiveTextFlag('bold')}
                  onclick={() => setActiveTextFlag('bold', !getActiveTextFlag('bold'))}
                  aria-label="Bold"
                  aria-pressed={getActiveTextFlag('bold')}
                  title="Bold"
                ><strong>B</strong></button>
                <button
                  class="style-btn"
                  class:active={getActiveTextFlag('italic')}
                  onclick={() => setActiveTextFlag('italic', !getActiveTextFlag('italic'))}
                  aria-label="Italic"
                  aria-pressed={getActiveTextFlag('italic')}
                  title="Italic"
                ><em>I</em></button>
                <button
                  class="style-btn"
                  class:active={getActiveTextFlag('underline')}
                  onclick={() => setActiveTextFlag('underline', !getActiveTextFlag('underline'))}
                  aria-label="Underline"
                  aria-pressed={getActiveTextFlag('underline')}
                  title="Underline"
                ><span class="u">U</span></button>
              </div>
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
              <span class="strip-value mono">{Math.round(getSettingValue())} {activeTool.settingUnit}</span>
            {/if}
          </div>
        {/if}

        <div class="toolbar glass" role="toolbar" aria-label="Editing tools">
          <div class="tool-group">
            {#each REDACT_TOOLS as t (t.id)}
              <button
                class="tool-btn"
                class:active={app.tool === t.id}
                onclick={() => { app.tool = t.id; selectedId = null; }}
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
                onclick={() => { app.tool = t.id; selectedId = null; }}
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
  .empty-footer {
    margin-top: var(--space-10);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding-top: var(--space-5);
    border-top: 1px solid var(--border-hairline);
    width: min(440px, 100%);
  }
  .empty-formats {
    font-size: 12px;
    color: var(--ink-tertiary);
  }
  .empty-promise {
    font-size: 13px;
    color: var(--ink-secondary);
    line-height: 1.5;
    text-align: center;
    max-width: 360px;
  }
  .empty-links {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 13px;
  }
  .empty-links a {
    color: var(--ink-secondary);
    text-decoration: none;
    transition: color 120ms ease;
  }
  .empty-links a:hover {
    color: var(--ink-primary);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .empty-links span {
    color: var(--ink-disabled);
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
  @media (min-width: 768px) {
    .canvas { max-height: calc(100dvh - 256px); }
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
  .selection-preview.ellipse { border-radius: 50%; }
  .shape-group { display: flex; gap: 2px; }

  .selection-mark {
    position: absolute;
    border: 1.5px dashed var(--accent-canvas-selection);
    border-radius: 2px;
    pointer-events: none;
    box-sizing: border-box;
  }
  .selection-mark.ellipse { border-radius: 50%; }
  .resize-handle {
    position: absolute;
    width: 12px;
    height: 12px;
    margin-left: -6px;
    margin-top: -6px;
    background: var(--surface-elevated);
    border: 1.5px solid var(--accent-canvas-selection);
    border-radius: 50%;
    pointer-events: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .text-input {
    position: absolute;
    background: transparent;
    border: 1.5px solid var(--accent-canvas-selection);
    border-radius: 6px;
    padding: 4px 10px;
    font-family: var(--font-sans);
    font-weight: 500;
    line-height: 1.2;
    outline: none;
    min-width: 180px;
    caret-color: var(--accent-canvas-selection);
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  }
  .text-input::placeholder { color: var(--ink-tertiary); font-weight: 400; }
  .text-input.bold { font-weight: 700; }
  .text-input.italic { font-style: italic; }
  .text-input.underline { text-decoration: underline; text-underline-offset: 3px; }

  .text-style-group {
    display: flex;
    gap: 2px;
  }
  .style-btn {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: var(--ink-primary);
    font-size: 13px;
    transition: background 120ms ease, color 120ms ease, transform 80ms ease;
  }
  .style-btn:hover:not(.active) { background: var(--border-hairline); }
  .style-btn:active { transform: scale(0.96); }
  .style-btn.active {
    background: var(--ink-primary);
    color: var(--ink-inverse);
  }
  .style-btn .u { text-decoration: underline; text-underline-offset: 2px; }

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
