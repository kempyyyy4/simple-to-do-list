// The Customisation panel. Pick a theme on the left and change anything about it on the right.
// Built-in themes are read-only, so duplicate one to make your own. Changes apply live.
(() => {
  'use strict';

  const { FONTS, BUILTIN_THEMES, Picker } = window.Todo;
  const panel = document.getElementById('customise');
  const cards = document.getElementById('custCards');
  const editor = document.getElementById('custEditor');
  const actions = panel.querySelector('.cust-actions');

  let api = null;
  let selectedId = null;

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const uid = () => Math.random().toString(36).slice(2, 10);

  const COLOUR_FIELDS = [
    ['bg', 'Background'], ['panel', 'Panels'], ['fg', 'Text'], ['muted', 'Muted text'],
    ['border', 'Borders'], ['hover', 'Hover'], ['accent', 'Accent'], ['accent2', 'Second accent'],
  ];
  const MOTION_STYLES = [['off', 'Off'], ['chess', 'Chess (smooth)'], ['retro', '1964 (retro)'], ['arcade', 'Arcade (satisfying)']];
  const CARETS = [['default', 'Default'], ['coder', 'Coder (block)'], ['smooth', 'Smooth (glide)']];
  const BUTTON_SHAPES = [['square', 'Square'], ['soft', 'Soft'], ['pill', 'Pill']];

  const selected = () => api.themes().find(t => t.id === selectedId) || api.themes()[0];

  function field(label, control, wide = false) {
    const wrap = el('label', `cust-field${wide ? ' wide' : ''}`);
    wrap.append(el('span', 'cust-label', label), control);
    return wrap;
  }

  function colourInput(theme, key) {
    const input = el('input');
    input.type = 'color';
    input.value = theme.colors[key];
    input.oninput = () => {
      theme.colors[key] = input.value;
      api.touch();
      renderCards();
    };
    return input;
  }

  function slider(theme, key, min, max, step, unit = '', onChange) {
    const row = el('span', 'cust-range');
    const input = el('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = theme[key];
    const out = el('output', '', `${theme[key]}${unit}`);
    input.oninput = () => {
      theme[key] = Number(input.value);
      out.textContent = `${input.value}${unit}`;
      (onChange || api.touch)();
    };
    row.append(input, out);
    return row;
  }

  function toggle(theme, key) {
    const input = el('input');
    input.type = 'checkbox';
    input.checked = theme[key];
    input.onchange = () => {
      theme[key] = input.checked;
      api.touch();
    };
    return input;
  }

  function select(options, value, onChange) {
    const s = el('select');
    options.forEach(([v, l]) => s.append(new Option(l, v)));
    s.value = value;
    s.onchange = () => onChange(s.value);
    return s;
  }

  function section(title, ...children) {
    const s = el('section', 'cust-section');
    s.append(el('h3', '', title));
    const grid = el('div', 'cust-grid');
    grid.append(...children);
    s.append(grid);
    return s;
  }

  function renderCards() {
    const current = api.activeId();
    cards.replaceChildren(...api.themes().map(t => {
      const card = el('button', `card${t.id === current ? ' active' : ''}`);
      card.type = 'button';
      const strip = el('span', 'card-swatch');
      [t.colors.bg, t.colors.panel, t.colors.accent, t.colors.accent2, t.colors.fg].forEach(c => {
        const i = el('i');
        i.style.background = c;
        strip.append(i);
      });
      const name = el('span', 'card-name', t.name);
      name.style.fontFamily = (FONTS.find(f => f.id === t.font) || FONTS[0]).stack;
      card.append(strip, name, el('span', 'card-tag', t.builtin ? 'Built-in' : 'Custom'));
      card.onclick = () => {
        selectedId = t.id;
        api.activate(t.id);
        renderAll();
      };
      return card;
    }));
  }

  function renderEditor() {
    const t = selected();
    editor.textContent = '';
    const frame = el('fieldset', 'cust-editor-inner');
    frame.disabled = t.builtin;
    if (t.builtin) {
      frame.append(el('p', 'cust-note', `${t.name} is built in. Duplicate it to make changes.`));
    }

    const fontPicker = Picker.create({
      items: FONTS.map(f => ({ value: f.id, label: f.label, style: `font-family: ${f.stack}` })),
      value: t.font,
      onChange: v => { t.font = v; api.touch(); renderCards(); },
    });

    const colours = section('Colours', ...COLOUR_FIELDS.map(([key, label]) => field(label, colourInput(t, key))));
    const type = section('Type',
      field('Font', fontPicker.el, true),
      field('Text size', slider(t, 'size', 12, 20, 1, 'px')),
      field('Uppercase headings', toggle(t, 'upper')),
    );
    const shape = section('Shape',
      field('Corner radius', slider(t, 'radius', 0, 24, 1, 'px')),
      field('Buttons', select(BUTTON_SHAPES, t.buttons, v => { t.buttons = v; api.touch(); })),
      field('Row spacing', slider(t, 'density', 0, 12, 1, 'px')),
      field('Panel opacity', slider(t, 'panelAlpha', 30, 100, 1, '%')),
      field('Glass blur', slider(t, 'blur', 0, 24, 1, 'px')),
    );
    const effects = section('Effects',
      field('Glow', slider(t, 'glow', 0, 100, 1)),
      field('Shadow', slider(t, 'shadow', 0, 100, 1)),
      field('Grid background', toggle(t, 'grid')),
      field('Scanlines', toggle(t, 'scanlines')),
    );
    const motion = section('Motion',
      field('Animation', select(MOTION_STYLES, t.motion.anim, v => { t.motion.anim = v; api.activate(t.id); })),
      field('Animation length', slider(t.motion, 'speed', 0.5, 2.5, 0.05, '×', () => api.activate(t.id))),
      field('Text cursor', select(CARETS, t.motion.caret, v => { t.motion.caret = v; api.activate(t.id); })),
    );
    frame.append(colours, type, shape, effects, motion);
    editor.append(frame);
  }

  function renderAll() {
    renderCards();
    renderEditor();
  }

  function newFrom(source, name) {
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = uid();
    copy.name = name;
    copy.builtin = false;
    return copy;
  }

  actions.addEventListener('click', e => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    const current = selected();
    if (act === 'new' || act === 'dup') {
      const name = prompt('Name for the new theme', act === 'new' ? 'My theme' : `${current.name} copy`);
      if (!name) return;
      const copy = newFrom(act === 'new' ? BUILTIN_THEMES[0] : current, name.trim());
      api.addCustom(copy);
      selectedId = copy.id;
    } else if (act === 'rename') {
      if (current.builtin) return;
      const name = prompt('Rename theme', current.name);
      if (!name) return;
      current.name = name.trim();
      api.touch();
    } else if (act === 'delete') {
      if (current.builtin) return;
      if (!confirm(`Delete "${current.name}"?`)) return;
      api.removeCustom(current.id);
      selectedId = null;
    }
    renderAll();
  });

  function open(startId) {
    selectedId = startId || api.activeId();
    panel.hidden = false;
    renderAll();
    const M = api.motion();
    if (M.dur) {
      panel.animate([{ opacity: 0, transform: 'scale(0.98)' }, { opacity: 1, transform: 'none' }], { duration: M.dur, easing: M.ease });
    }
  }

  function close() {
    panel.hidden = true;
  }

  document.getElementById('custClose').onclick = close;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });

  window.Todo.Customise = {
    init(options) {
      api = options;
    },
    open,
    close,
    refresh: () => { if (!panel.hidden) renderAll(); },
  };
})();
