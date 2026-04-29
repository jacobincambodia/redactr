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
 * @param {number} blockSize — pixel block size, typically 5–80
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
 * Blur a region. Applied twice for irreversibility — single-pass gaussian blur has
 * been shown reversible in some adversarial scenarios; double-pass is dramatically harder.
 */
export function blur(ctx, originalImage, x, y, w, h, radius, shape = 'rect') {
  if (w < 2 || h < 2) return;

  const off1 = document.createElement('canvas');
  off1.width = w;
  off1.height = h;
  const off1Ctx = off1.getContext('2d');
  off1Ctx.filter = `blur(${radius}px)`;
  off1Ctx.drawImage(originalImage, x, y, w, h, 0, 0, w, h);

  const off2 = document.createElement('canvas');
  off2.width = w;
  off2.height = h;
  const off2Ctx = off2.getContext('2d');
  off2Ctx.filter = `blur(${radius}px)`;
  off2Ctx.drawImage(off1, 0, 0);

  ctx.save();
  clipToShape(ctx, x, y, w, h, shape);
  ctx.drawImage(off2, x, y);
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
      pixelate(ctx, originalImage, ann.x, ann.y, ann.w, ann.h, ann.blockSize, ann.shape);
      break;
    case 'blur':
      blur(ctx, originalImage, ann.x, ann.y, ann.w, ann.h, ann.radius, ann.shape);
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
