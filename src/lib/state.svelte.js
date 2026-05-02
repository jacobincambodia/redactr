// Shared application state using Svelte 5 runes.
//
// Claude Code will expand this. The shape below is the minimum needed for v1.

import { DEFAULT_TOOL, DEFAULT_COLOR } from './tools.js';

// crypto.randomUUID requires a secure context. On iOS Safari, that means HTTPS
// or localhost — LAN HTTP (e.g. http://192.168.x.x for phone testing) is not
// secure, and crypto.randomUUID is undefined there. IDs only live in this tab
// and never leave the browser, so a non-cryptographic fallback is fine.
function makeId() {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

class AppState {
  // Image
  image = $state(null); // { src, name, width, height, element }

  // Active tool & settings
  tool = $state(DEFAULT_TOOL);
  color = $state(DEFAULT_COLOR);
  // Strength on a 1–100 scale, mapped to actual pixel block / radius at draw
  // time so "max" stays subjectively-strong on any image size. See
  // strengthToPixels in redact.js for the mapping.
  pixelateStrength = $state(50);
  blurStrength = $state(50);
  // strokeWidth is in display pixels — the slider speaks display, the
  // annotation stores image pixels via displayToImagePx at create time.
  strokeWidth = $state(6);
  fontSize = $state(48);
  textBold = $state(false);
  textItalic = $state(false);
  textUnderline = $state(false);
  redactShape = $state('rect'); // 'rect' | 'ellipse', applies to blackbox/pixelate/blur

  // Annotations on the active image
  annotations = $state([]);

  // Theme: 'light' | 'dark' | 'system'
  theme = $state('system');

  // Methods
  setImage(image) {
    this.image = image;
    this.annotations = [];
  }

  addAnnotation(ann) {
    const id = makeId();
    this.annotations = [...this.annotations, { ...ann, id }];
    return id;
  }

  updateAnnotation(id, patch) {
    this.annotations = this.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a));
  }

  deleteAnnotation(id) {
    this.annotations = this.annotations.filter((a) => a.id !== id);
  }

  undoLast() {
    this.annotations = this.annotations.slice(0, -1);
  }

  clearAll() {
    this.annotations = [];
  }

  setTheme(theme) {
    this.theme = theme;
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('redactr.theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('redactr.theme', theme);
    }
  }
}

export const app = new AppState();
