// Core canvas operations for Redactr.
//
// All redaction operations sample from the ORIGINAL image, never from the displayed
// canvas. This keeps multiple redactions consistent and prevents compounding artifacts.
//
// Annotation shape (used throughout):
//   {
//     id: string,
//     tool: 'blackbox' | 'pixelate' | 'blur' | 'rect' | 'arrow' | 'text',
//     x: number, y: number, w: number, h: number,   // for rectangular tools
//     // tool-specific:
//     blockSize?: number,    // pixelate
//     radius?: number,       // blur
//     color?: string,        // markup tools
//     strokeWidth?: number,  // rect, arrow
//     text?: string,         // text tool
//     fontSize?: number,     // text tool
//   }

/**
 * Apply a black box redaction. Original pixels under the shape are destroyed.
 */
export function blackBox(ctx, x, y, w, h, shape = 'rect') {
  ctx.fillStyle = '#000';
  if (shape === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }
}

// Convert a strength setting (1–100, user-facing) into a real pixel value
// scaled to the redaction region. Mapping is linear: max strength reaches
// 30% of the region's smaller dimension. The floor stops tiny regions from
// producing a uselessly weak result. Same shape for blur and pixelate so
// "strong" reads consistently between the two tools.
function strengthToPixels(strength, w, h, floor) {
  const minDim = Math.min(Math.abs(w), Math.abs(h));
  return Math.max(floor, (strength / 100) * 0.30 * minDim);
}

export function blurRadiusFor(strength, w, h) {
  return strengthToPixels(strength, w, h, 8);
}
export function pixelateBlockFor(strength, w, h) {
  return strengthToPixels(strength, w, h, 6);
}

// Internal: clip context to the annotation shape so the operation is masked.
function clipToShape(ctx, x, y, w, h, shape) {
  if (shape !== 'ellipse') return;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
  ctx.clip();
}

/**
 * Pixelate a region. Samples from originalImage, downsamples to (w/blockSize) x (h/blockSize),
 * then upsamples back with smoothing disabled to produce visible blocks.
 *
 * @param {CanvasRenderingContext2D} ctx — the destination canvas context
 * @param {HTMLImageElement|HTMLCanvasElement} originalImage — the source image
 * @param {number} x, y, w, h — the region to pixelate, in source coordinates
 * @param {number} blockSize — pixel block size in source-image pixels.
 *   Pass `pixelateBlockFor(strength, w, h)` to derive this from the
 *   user-facing strength setting.
 */
export function pixelate(ctx, originalImage, x, y, w, h, blockSize, shape = 'rect') {
  if (w < 2 || h < 2) return;

  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  off.getContext('2d').drawImage(originalImage, x, y, w, h, 0, 0, w, h);

  const sw = Math.max(1, Math.floor(w / blockSize));
  const sh = Math.max(1, Math.floor(h / blockSize));
  const small = document.createElement('canvas');
  small.width = sw;
  small.height = sh;
  const smallCtx = small.getContext('2d');
  smallCtx.imageSmoothingEnabled = false;
  smallCtx.drawImage(off, 0, 0, sw, sh);

  ctx.save();
  clipToShape(ctx, x, y, w, h, shape);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, sw, sh, x, y, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.restore();
}

/**
 * Blur a region.
 *
 * Implementation: iterative half-downscale with bilinear smoothing. Each pass
 * shrinks the pixel data by 50%; the canvas's bilinear sampler averages 4
 * source pixels into each destination pixel. After N passes, each pixel is
 * the average of ~4^N source pixels, which is both visually smooth and
 * irreversible (a radius=20 blur averages over ~1024 source pixels per
 * output pixel — drastically underdetermined for inversion).
 *
 * Why not `ctx.filter = 'blur(...)'`? iOS Safari has unreliable Canvas 2D
 * `filter` support — it silently no-ops in some configurations, which would
 * leak the original pixels through both preview and export. The downscale
 * approach uses only universally-supported drawImage scaling.
 */
export function blur(ctx, originalImage, x, y, w, h, radius, shape = 'rect') {
  if (w < 2 || h < 2) return;

  // Number of halving passes. log2 maps the user-facing radius slider
  // (5–50px) onto a sensible blur strength: radius=5 → ~3 passes (8x),
  // radius=20 → ~5 passes (32x), radius=50 → ~6 passes (64x).
  const passes = Math.max(1, Math.ceil(Math.log2(radius)));

  // Pass 0: copy the source region into a same-sized offscreen canvas.
  let cur = document.createElement('canvas');
  cur.width = w;
  cur.height = h;
  cur.getContext('2d').drawImage(originalImage, x, y, w, h, 0, 0, w, h);
  let curW = w, curH = h;

  // Iteratively halve until we have a tiny canvas.
  for (let i = 0; i < passes; i++) {
    const newW = Math.max(2, Math.floor(curW / 2));
    const newH = Math.max(2, Math.floor(curH / 2));
    const next = document.createElement('canvas');
    next.width = newW;
    next.height = newH;
    const nctx = next.getContext('2d');
    nctx.imageSmoothingEnabled = true;
    nctx.imageSmoothingQuality = 'high';
    nctx.drawImage(cur, 0, 0, newW, newH);
    cur = next;
    curW = newW;
    curH = newH;
  }

  // Upscale the tiny result back into the destination region. Bilinear
  // smoothing on the way up turns the blocky thumbnail into a smooth blur.
  ctx.save();
  clipToShape(ctx, x, y, w, h, shape);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cur, 0, 0, curW, curH, x, y, w, h);
  ctx.restore();
}

/**
 * Draw an outlined rectangle for markup.
 */
export function drawRect(ctx, x, y, w, h, color, strokeWidth) {
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.strokeRect(x, y, w, h);
}

/**
 * Draw an arrow from (x1,y1) to (x2,y2). Arrowhead size scales with stroke width.
 */
export function drawArrow(ctx, x1, y1, x2, y2, color, strokeWidth) {
  const headLen = Math.max(22, strokeWidth * 5);
  const angle = Math.atan2(y2 - y1, x2 - x1);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';

  // Shaft, stopping short of where the arrowhead starts
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle) * 0.5,
    y2 - headLen * Math.sin(angle) * 0.5
  );
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a text annotation. The text has a contrasting outline so it stays readable
 * over any background.
 */
export function drawText(ctx, x, y, text, color, fontSize, _isDark, opts = {}) {
  const { bold = false, italic = false, underline = false } = opts;
  const style = italic ? 'italic ' : '';
  const weight = bold ? '700' : '500';
  const sansVar = getComputedStyle(document.documentElement).getPropertyValue('--font-sans') || 'system-ui';
  ctx.font = `${style}${weight} ${fontSize}px ${sansVar}`;
  ctx.textBaseline = 'top';

  ctx.fillStyle = color;
  ctx.fillText(text, x, y);

  if (underline) {
    const w = ctx.measureText(text).width;
    const thickness = Math.max(1.5, fontSize * 0.06);
    const yLine = y + fontSize + thickness * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(x, yLine);
    ctx.lineTo(x + w, yLine);
    ctx.stroke();
  }
}

/**
 * Dispatch to the right draw function based on annotation type.
 * Used both during live preview and during export flatten.
 */
export function drawAnnotation(ctx, ann, originalImage, isDarkTheme = false) {
  switch (ann.tool) {
    case 'blackbox':
      blackBox(ctx, ann.x, ann.y, ann.w, ann.h, ann.shape);
      break;
    case 'pixelate':
      pixelate(ctx, originalImage, ann.x, ann.y, ann.w, ann.h,
        pixelateBlockFor(ann.strength, ann.w, ann.h), ann.shape);
      break;
    case 'blur':
      blur(ctx, originalImage, ann.x, ann.y, ann.w, ann.h,
        blurRadiusFor(ann.strength, ann.w, ann.h), ann.shape);
      break;
    case 'rect':
      drawRect(ctx, ann.x, ann.y, ann.w, ann.h, ann.color, ann.strokeWidth);
      break;
    case 'arrow':
      drawArrow(ctx, ann.x, ann.y, ann.x + ann.w, ann.y + ann.h, ann.color, ann.strokeWidth);
      break;
    case 'text':
      drawText(ctx, ann.x, ann.y, ann.text, ann.color, ann.fontSize, isDarkTheme, {
        bold: ann.bold, italic: ann.italic, underline: ann.underline,
      });
      break;
  }
}

/**
 * Export the image with all annotations applied, to a downloaded PNG file.
 * Re-encodes through canvas, which strips all original metadata (EXIF, GPS, color profiles).
 */
export function exportPng(originalImage, annotations, filename) {
  const out = document.createElement('canvas');
  out.width = originalImage.width;
  out.height = originalImage.height;
  const ctx = out.getContext('2d');

  ctx.drawImage(originalImage, 0, 0);
  for (const ann of annotations) {
    drawAnnotation(ctx, ann, originalImage);
  }

  out.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

/**
 * Translate a pointer event into canvas coordinates, accounting for the canvas
 * being displayed at a different size than its underlying pixel resolution.
 */
export function getCanvasPos(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

/**
 * Normalize a rectangle so width and height are positive, no matter which
 * direction the user dragged.
 */
export function normalizeRect(x, y, w, h) {
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  return { x, y, w, h };
}
