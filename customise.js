// The customisation panel. It docks to the right, like Settings, and edits the active theme.
// Built-in themes are read-only, so duplicate one to change it. Changes apply live.
(() => {
  'use strict';

  const { FONTS, BUILTIN_THEMES } = window.Todo;
  const panel = document.getElementById('customise');
  const editor = document.getElementById('custEditor');
  const titleEl = document.getElementById('custTitle');

  let api = null;

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
  const MOTION_STYLES = [['off', 'Off'], ['chess', 'Chess'], ['retro', '1964'], ['arcade', 'Arcade']];
  const CARETS = [['default', 'Default'], ['coder', 'Coder'], ['smooth', 'Smooth']];
  const BUTTON_SHAPES = [['square', 'Square'], ['soft', 'Soft'], ['pill', 'Pill']];

  const current = () => api.themes().find(t => t.id === api.activeId()) || api.themes()[0];

  function field(label, control, wide = false) {
    const wrap = el('label', `cust-field${wide ? ' wide' : ''}`);
    wrap.append(el('span', '', label), control);
    return wrap;
  }

  function section(title, ...children) {
    const s = el('section', 'cust-section');
    s.append(el('h3', '', title));
    const grid = el('div', 'cust-grid');
    grid.append(...children);
    s.append(grid);
    return s;
  }

  function colourInput(t, key) {
    const input = el('input');
    input.type = 'color';
    input.value = t.colors[key];
    input.oninput = () => {
      t.colors[key] = input.value;
      api.touch();
    };
    return input;
  }

  // Number slider. onChange defaults to a plain save.
  function slider(obj, key, min, max, step, unit = '', onChange = api.touch) {
    const row = el('span', 'cust-range');
    const input = el('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = obj[key];
    const out = el('output', '', `${obj[key]}${unit}`);
    input.oninput = () => {
      obj[key] = Number(input.value);
      out.textContent = `${input.value}${unit}`;
      onChange();
    };
    row.append(input, out);
    return row;
  }

  function toggle(obj, key) {
    const input = el('input');
    input.type = 'checkbox';
    input.checked = obj[key];
    input.onchange = () => {
      obj[key] = input.checked;
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

  // The full font list. Each name is drawn in its own font, like a word processor's list.
  function fontList(t) {
    const list = el('div', 'font-list');
    const items = FONTS.map(f => {
      const b = el('button', `font-item${f.id === t.font ? ' active' : ''}`);
      b.type = 'button';
      b.style.fontFamily = f.stack;
      b.append(el('span', '', f.label), el('small', '', 'Aa'));
      b.onclick = () => {
        t.font = f.id;
        list.querySelectorAll('.font-item').forEach(x => x.classList.toggle('active', x === b));
        api.touch();
      };
      return b;
    });
    list.append(...items);
    return list;
  }

  function render() {
    const t = current();
    titleEl.textContent = t.name;

    const frame = el('fieldset', 'cust-editor-inner');
    frame.disabled = t.builtin;
    if (t.builtin) frame.append(el('p', 'cust-note', `${t.name} is built in. Duplicate it to make changes.`));

    const colours = section('Colours', ...COLOUR_FIELDS.map(([key, label]) => field(label, colourInput(t, key))));
    const type = section('Type',
      field('Font', fontList(t), true),
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
    // Motion lives on the theme and is copied into Settings when it's the active theme.
    const motionSection = section('Motion',
      field('Animation', select(MOTION_STYLES, t.motion.anim, v => { t.motion.anim = v; api.applyMotion(); })),
      field('Animation length', slider(t.motion, 'speed', 0.5, 2.5, 0.05, '×', () => api.applyMotion())),
      field('Text cursor', select(CARETS, t.motion.caret, v => { t.motion.caret = v; api.applyMotion(); })),
    );
    frame.append(colours, type, shape, effects, motionSection);
    editor.replaceChildren(frame);
  }

  function copyOf(source, name) {
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = uid();
    copy.name = name;
    copy.builtin = false;
    return copy;
  }

  panel.querySelector('.cust-actions').addEventListener('click', e => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    const t = current();
    if (act === 'new' || act === 'dup') {
      const name = prompt('Name for the new theme', act === 'new' ? 'My theme' : `${t.name} copy`);
      if (!name) return;
      const base = act === 'new' ? BUILTIN_THEMES[0] : t;
      api.addCustom(copyOf(base, name.trim()));
    } else if (act === 'rename') {
      if (t.builtin) return;
      const name = prompt('Rename theme', t.name);
      if (!name) return;
      t.name = name.trim();
      api.touch();
      render();
    } else if (act === 'delete') {
      if (t.builtin) return;
      if (!confirm(`Delete "${t.name}"?`)) return;
      api.removeCustom(t.id);
    }
  });

  // Edits make many small changes. Turning transitions off while dragging keeps the sliders responsive.
  panel.addEventListener('pointerdown', () => window.Todo.setScale(0));
  window.addEventListener('pointerup', () => window.Todo.applyScale());

  function open() {
    // Built-in themes can't be edited, so editing one starts a copy of it.
    if (current().builtin) api.addCustom(copyOf(current(), `${current().name} copy`));
    panel.hidden = false;
    render();
    const M = api.motion();
    if (M.dur) panel.animate([{ opacity: 0, transform: 'translateY(-10px) scale(0.97)' }, { opacity: 1, transform: 'none' }], { duration: M.dur, easing: M.ease });
  }

  function close() {
    panel.hidden = true;
  }

  document.getElementById('custClose').onclick = close;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });
  // Like Settings, clicking anywhere else closes it.
  document.addEventListener('pointerdown', e => {
    if (panel.hidden || e.target.closest('#customise, #openCustomise, #settingsBtn')) return;
    close();
  });

  window.Todo.Customise = {
    init(options) {
      api = options;
    },
    open,
    close,
    refresh: () => { if (!panel.hidden) render(); },
  };
})();
