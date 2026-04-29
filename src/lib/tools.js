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
    metaLabel: 'BLOCK',
    settingKey: 'blockSize',
    settingMin: 5,
    settingMax: 80,
    settingDefault: 30,
    settingUnit: 'px',
    hasColor: false,
  },
  {
    id: 'blur',
    label: 'Blur',
    metaLabel: 'BLUR',
    settingKey: 'radius',
    settingMin: 5,
    settingMax: 50,
    settingDefault: 20,
    settingUnit: 'px',
    hasColor: false,
  },
];

export const MARKUP_TOOLS = [
  {
    id: 'rect',
    label: 'Rect',
    metaLabel: 'STROKE',
    settingKey: 'strokeWidth',
    settingMin: 1,
    settingMax: 12,
    settingDefault: 4,
    settingUnit: 'px',
    hasColor: true,
  },
  {
    id: 'arrow',
    label: 'Arrow',
    metaLabel: 'STROKE',
    settingKey: 'strokeWidth',
    settingMin: 1,
    settingMax: 12,
    settingDefault: 4,
    settingUnit: 'px',
    hasColor: true,
  },
  {
    id: 'text',
    label: 'Text',
    metaLabel: 'SIZE',
    settingKey: 'fontSize',
    settingMin: 14,
    settingMax: 72,
    settingDefault: 24,
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
