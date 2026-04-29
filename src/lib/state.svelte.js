// Shared application state using Svelte 5 runes.
//
// Claude Code will expand this. The shape below is the minimum needed for v1.

import { DEFAULT_TOOL, DEFAULT_COLOR } from './tools.js';

class AppState {
  // Image
  image = $state(null); // { src, name, width, height, element }

  // Active tool & settings
  tool = $state(DEFAULT_TOOL);
  color = $state(DEFAULT_COLOR);
  blockSize = $state(30);
  blurRadius = $state(20);
  strokeWidth = $state(8);
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
    const id = crypto.randomUUID();
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
