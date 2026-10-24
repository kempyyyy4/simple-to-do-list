// Themes are data: colours, type, shape, effects and motion. The CSS only reads the variables
// that applyTheme() sets, so a custom theme is just another object like these.
window.Todo = window.Todo || {};
(() => {
  'use strict';

  // Stacks use fonts already installed on the machine, so the app works offline.
  const FONTS = [
    { id: 'sans', label: 'System sans', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
    { id: 'modern', label: 'Modern', stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
    { id: 'humanist', label: 'Humanist', stack: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif' },
    { id: 'condensed', label: 'Condensed', stack: '"Arial Narrow", "Franklin Gothic Medium", sans-serif' },
    { id: 'rounded', label: 'Rounded', stack: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif' },
    { id: 'serif', label: 'Serif', stack: 'Georgia, "Times New Roman", serif' },
    { id: 'garamond', label: 'Garamond', stack: 'Garamond, "EB Garamond", "Palatino Linotype", serif' },
    { id: 'typewriter', label: 'Typewriter', stack: '"Courier New", Courier, monospace' },
    { id: 'mono', label: 'Mono', stack: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
    { id: 'code', label: 'Code', stack: '"Cascadia Code", "Fira Code", Consolas, monospace' },
    { id: 'handwriting', label: 'Handwriting', stack: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive' },
  ];

  // Shown as placeholder text in the composer, and by the shuffle button.
  const WORDS = [
    'Something you would build on a Sunday',
    'The thing you keep postponing',
    'A name for a side project',
    'A tiny habit to try this week',
    'Sketch the ugliest version first',
    'Ask someone for feedback',
    'A question you have not answered',
    'Something to make for someone else',
    'Clean one drawer, just one',
    'Write the title before the body',
    'A book you keep meaning to start',
    'The smallest possible first step',
    'Something you would teach a friend',
    'An idea that scares you a little',
    'Fix the thing that annoys you daily',
    'A place you want to visit',
    'Take a photo of something ordinary',
    'The email you are avoiding',
    'A recipe you could improve',
    'Write down three things you noticed today',
    'An experiment with a one day deadline',
    'Something you could automate',
    'A better name for this list',
    'The question behind the question',
  ];

  const DEFAULTS = {
    font: 'sans',
    size: 15,          // base text size in px
    radius: 6,         // corner radius in px
    density: 5,        // row padding in px
    buttons: 'soft',   // 'square' | 'soft' | 'pill'
    upper: false,      // uppercase headings
    grid: false,       // faint grid behind the page
    scanlines: false,  // CRT-style scanlines
    panelAlpha: 100,   // panel opacity, percent
    blur: 0,           // backdrop blur behind panels, px (0 turns it off entirely)
    glow: 0,           // glow strength, 0 to 100
    shadow: 12,        // shadow strength, 0 to 100
    motion: { anim: 'chess', speed: 1, caret: 'default' },
  };

  function normalizeTheme(t, builtin = false) {
    return {
      ...DEFAULTS,
      ...t,
      colors: { ...t.colors },
      motion: { ...DEFAULTS.motion, ...(t.motion || {}) },
      builtin,
    };
  }

  function preset(id, name, colors, extra = {}) {
    return normalizeTheme({ id, name, colors, ...extra }, true);
  }

  const BUILTIN_THEMES = [
    preset('default', 'Default', {
      bg: '#f4ecd8', panel: '#f8f1e1', fg: '#5b4636', muted: '#a08c76',
      border: '#e3d6bb', hover: '#ece2cb', accent: '#b0622b', accent2: '#b0622b',
    }, { font: 'mono' }),
    preset('supersmooth', 'Supersmooth', {
      bg: '#f5f5f7', panel: '#ffffff', fg: '#1d1d1f', muted: '#86868b',
      border: '#d2d2d7', hover: '#e8e8ed', accent: '#0071e3', accent2: '#5ac8fa',
    }, {
      font: 'modern', size: 15, radius: 20, density: 8, buttons: 'pill', panelAlpha: 55, blur: 16, shadow: 35,
      motion: { anim: 'chess', speed: 2.2, caret: 'smooth' },
    }),
    preset('retro', 'Retro', {
      bg: '#1b1d36', panel: '#2a2d52', fg: '#fff3c4', muted: '#9aa3d6',
      border: '#4d5390', hover: '#3a3e6e', accent: '#ff4a4a', accent2: '#ffd43b',
    }, {
      font: 'rounded', size: 16, radius: 0, density: 6, buttons: 'square', upper: true,
      grid: true, scanlines: true, shadow: 0,
      motion: { anim: 'retro', speed: 1, caret: 'default' },
    }),
    preset('terminal', 'Terminal', {
      bg: '#050a05', panel: '#0a120a', fg: '#7cff8a', muted: '#3c7a45',
      border: '#17361c', hover: '#0e1f10', accent: '#5cff6a', accent2: '#5cff6a',
    }, { font: 'mono', glow: 30, grid: true, scanlines: true }),
  ];

  const DEFAULT_THEME_ID = 'default';

  function fontStack(id) {
    return (FONTS.find(f => f.id === id) || FONTS[0]).stack;
  }

  // Sets every variable the CSS reads. Colours are registered in styles.css, so they cross-fade.
  function applyTheme(t) {
    const html = document.documentElement;
    const s = html.style;
    Object.entries(t.colors).forEach(([key, value]) => s.setProperty(`--${key}`, value));
    s.setProperty('--font', fontStack(t.font));
    s.setProperty('--size', `${t.size}px`);
    s.setProperty('--radius', `${t.radius}px`);
    s.setProperty('--pad', `${t.density}px`);
    s.setProperty('--panel-alpha', `${t.panelAlpha}%`);
    s.setProperty('--blur', `${t.blur}px`);
    s.setProperty('--glow', t.glow
      ? `0 0 ${Math.round(t.glow / 3)}px color-mix(in srgb, var(--accent) ${t.glow}%, transparent)`
      : 'none');
    s.setProperty('--shadow', `0 ${Math.round(t.shadow / 6)}px ${Math.round(t.shadow / 2)}px rgba(0, 0, 0, ${(t.shadow / 300).toFixed(2)})`);
    html.dataset.buttons = t.buttons;
    html.dataset.upper = String(t.upper);
    html.dataset.grid = String(t.grid);
    html.dataset.scanlines = String(t.scanlines);
    html.dataset.glass = String(t.blur > 0);
  }

  window.Todo.FONTS = FONTS;
  window.Todo.WORDS = WORDS;
  window.Todo.BUILTIN_THEMES = BUILTIN_THEMES;
  window.Todo.DEFAULT_THEME_ID = DEFAULT_THEME_ID;
  window.Todo.DEFAULT_THEME_DATA = DEFAULTS;
  window.Todo.normalizeTheme = normalizeTheme;
  window.Todo.fontStack = fontStack;
  window.Todo.applyTheme = applyTheme;
})();
