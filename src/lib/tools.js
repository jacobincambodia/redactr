// Tool definitions used by the toolbar.
// The order here is the display order in the toolbar pill.

export const REDACT_TOOLS = [
  {
    id: 'blackbox',
    label: 'Black',
    metaLabel: null, // black box has no settings
    hasColor: false,
  },
  {
    id: 'pixelate',
    label: 'Pixel',
    metaLabel: 'PIXEL',
    // Strength on a 1–100 scale. The actual block size is computed as a
    // fraction of the region's smaller dimension (with a pixel floor) so
    // "max" reads the same on tiny crops and full screenshots.
    settingKey: 'strength',
    settingMin: 1,
    settingMax: 100,
    settingDefault: 50,
    hasColor: false,
  },
  {
    id: 'blur',
    label: 'Blur',
    metaLabel: 'BLUR',
    settingKey: 'strength',
    settingMin: 1,
    settingMax: 100,
    settingDefault: 50,
    hasColor: false,
  },
];

export const MARKUP_TOOLS = [
  {
    id: 'rect',
    label: 'Rect',
    metaLabel: 'STROKE',
    // strokeWidth is in display pixels at the slider/UI layer; the value
    // stored on the annotation is converted to image pixels at create time
    // so a 6-display-px stroke stays visible on tiny images and 4000-px
    // phone screenshots alike. See displayToImagePx in +page.svelte.
    settingKey: 'strokeWidth',
    settingMin: 1,
    settingMax: 12,
    settingDefault: 6,
    settingUnit: 'px',
    hasColor: true,
  },
  {
    id: 'arrow',
    label: 'Arrow',
    metaLabel: 'STROKE',
    settingKey: 'strokeWidth',
    settingMin: 2,
    settingMax: 24,
    settingDefault: 8,
    settingUnit: 'px',
    hasColor: true,
  },
  {
    id: 'text',
    label: 'Text',
    metaLabel: 'SIZE',
    settingKey: 'fontSize',
    settingMin: 14,
    settingMax: 200,
    settingDefault: 48,
    settingUnit: 'px',
    hasColor: true,
  },
];

export const MARKUP_COLORS = [
  { id: 'red', value: '#ef4444' },
  { id: 'amber', value: '#f59e0b' },
  { id: 'green', value: '#10b981' },
  { id: 'blue', value: '#3b82f6' },
  { id: 'white', value: '#ffffff' },
  { id: 'black', value: '#1a1a1a' },
];

export const DEFAULT_TOOL = 'blackbox';
export const DEFAULT_COLOR = '#ef4444';
