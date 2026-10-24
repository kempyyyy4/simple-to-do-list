// A floating notepad for one task. Blocks can be text, headings, to-dos, trackers, charts or dividers.
// The note is stored on the task as node.note = { blocks: [...] }.
// Drag the title bar outside the app window and the note pops out into its own window.
(() => {
  'use strict';

  const win = document.getElementById('noteWin');
  const body = document.getElementById('noteBody');
  const titleEl = document.getElementById('noteTitle');
  const popBtn = document.getElementById('notePop');
  const closeBtn = document.getElementById('noteClose');

  let nodeId = null;
  let opts = null;
  let node = null;

  const uid = () => Math.random().toString(36).slice(2, 10);
  const motion = () => (opts && opts.motion ? opts.motion() : { dur: 0, ease: 'linear' });

  function makeBlock(type) {
    const base = { id: uid(), type };
    switch (type) {
      case 'text':
      case 'heading':
        return { ...base, text: '' };
      case 'todo':
        return { ...base, text: '', checked: false };
      case 'tracker':
        return { ...base, label: 'Progress', value: 0, goal: 10 };
      case 'chart':
        return { ...base, title: 'Chart', values: '3, 5, 8, 4' };
      default:
        return base;
    }
  }

  // "Mon 3, Tue 5" or "3, 5, 8". Anything that isn't a number becomes a zero.
  function parseValues(str) {
    return str.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => {
      const m = s.match(/^(.*?)[\s:]*(-?\d+(?:\.\d+)?)$/);
      return m ? { label: m[1].trim() || String(i + 1), value: Number(m[2]) } : { label: s, value: 0 };
    });
  }

  function el(tag, text) {
    const n = document.createElement(tag);
    n.textContent = text;
    return n;
  }

  function focusBlock(id) {
    const target = body.querySelector(`[data-bid="${id}"] .nb-focus`);
    if (!target) return;
    target.focus();
    if (target.isContentEditable) {
      const range = document.createRange();
      range.selectNodeContents(target);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function changed() {
    opts.onChange();
  }

  function insertAfter(index, block) {
    node.note.blocks.splice(index + 1, 0, block);
    changed();
    render();
    focusBlock(block.id);
  }

  function removeAt(index, focusPrev = true) {
    node.note.blocks.splice(index, 1);
    if (node.note.blocks.length === 0) node.note.blocks.push(makeBlock('text'));
    changed();
    render();
    const prev = node.note.blocks[Math.max(0, index - 1)];
    if (focusPrev && prev) focusBlock(prev.id);
  }

  function wrap(block, index, inner) {
    const div = document.createElement('div');
    div.className = `nb nb-${block.type}`;
    div.dataset.bid = block.id;
    const del = document.createElement('button');
    del.className = 'nb-del';
    del.type = 'button';
    del.title = 'Remove block';
    del.textContent = '×';
    del.onclick = () => removeAt(index, false);
    div.append(inner, del);
    return div;
  }

  function textBlock(block, index, heading) {
    const div = document.createElement('div');
    div.className = `nb-focus ${heading ? 'nb-heading' : 'nb-text'}`;
    div.contentEditable = 'true';
    div.spellcheck = true;
    div.textContent = block.text;
    div.dataset.placeholder = heading ? 'Heading' : 'Write something…';
    div.oninput = () => { block.text = div.textContent; changed(); };
    div.onkeydown = e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        insertAfter(index, makeBlock('text'));
      } else if (e.key === 'Backspace' && div.textContent === '') {
        e.preventDefault();
        removeAt(index);
      }
    };
    return wrap(block, index, div);
  }

  function todoBlock(block, index) {
    const row = document.createElement('div');
    row.className = 'nb-todo-row';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = block.checked;
    check.onchange = () => { block.checked = check.checked; changed(); render(); };
    const text = document.createElement('input');
    text.type = 'text';
    text.className = `nb-focus nb-input${block.checked ? ' done' : ''}`;
    text.value = block.text;
    text.placeholder = 'To-do';
    text.oninput = () => { block.text = text.value; changed(); };
    text.onkeydown = e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        insertAfter(index, makeBlock('todo'));
      } else if (e.key === 'Backspace' && text.value === '') {
        e.preventDefault();
        removeAt(index);
      }
    };
    row.append(check, text);
    return wrap(block, index, row);
  }

  function trackerBlock(block, index) {
    const box = document.createElement('div');
    box.className = 'nb-card';
    const label = document.createElement('input');
    label.type = 'text';
    label.className = 'nb-focus nb-input nb-card-title';
    label.value = block.label;
    label.oninput = () => { block.label = label.value; changed(); };

    const bar = document.createElement('div');
    bar.className = 'nb-bar';
    const fill = document.createElement('i');
    bar.append(fill);

    const controls = document.createElement('div');
    controls.className = 'nb-card-row';
    const value = document.createElement('input');
    value.type = 'number';
    value.className = 'nb-num';
    value.value = block.value;
    const goal = document.createElement('input');
    goal.type = 'number';
    goal.className = 'nb-num';
    goal.value = block.goal;
    goal.min = '1';
    const readout = document.createElement('span');
    readout.className = 'nb-readout';

    const update = () => {
      const pct = block.goal > 0 ? Math.min(100, (block.value / block.goal) * 100) : 0;
      fill.style.width = `${pct}%`;
      readout.textContent = `${Math.round(pct)}%`;
    };
    const setValue = v => {
      block.value = v;
      value.value = v;
      changed();
      update();
    };
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.onclick = () => setValue(Math.max(0, Math.round((block.value - 1) * 100) / 100));
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.onclick = () => setValue(Math.round((block.value + 1) * 100) / 100);

    value.oninput = () => { block.value = Number(value.value) || 0; changed(); update(); };
    goal.oninput = () => { block.goal = Number(goal.value) || 1; changed(); update(); };

    controls.append(minus, value, el('span', '/'), goal, plus, readout);
    box.append(label, bar, controls);
    update();
    return wrap(block, index, box);
  }

  function chartBlock(block, index) {
    const box = document.createElement('div');
    box.className = 'nb-card';
    const title = document.createElement('input');
    title.type = 'text';
    title.className = 'nb-focus nb-input nb-card-title';
    title.value = block.title;
    title.oninput = () => { block.title = title.value; changed(); };

    const values = document.createElement('input');
    values.type = 'text';
    values.className = 'nb-input nb-small';
    values.value = block.values;
    values.placeholder = 'Mon 3, Tue 5, Wed 8';
    const svgWrap = document.createElement('div');
    const redraw = () => svgWrap.replaceChildren(barChart(parseValues(block.values)));
    values.oninput = () => { block.values = values.value; changed(); redraw(); };
    redraw();

    box.append(title, svgWrap, values);
    return wrap(block, index, box);
  }

  function barChart(data) {
    const NS = 'http://www.w3.org/2000/svg';
    const W = Math.max(220, data.length * 44);
    const H = 130;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const max = Math.max(1, ...data.map(d => Math.abs(d.value)));
    const slot = W / Math.max(1, data.length);
    const barW = Math.min(28, slot * 0.6);
    const M = motion();

    data.forEach((d, i) => {
      const h = (Math.abs(d.value) / max) * (H - 30);
      const x = i * slot + (slot - barW) / 2;
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', H - 18 - h);
      rect.setAttribute('width', barW);
      rect.setAttribute('height', h);
      rect.setAttribute('rx', 3);
      rect.setAttribute('fill', 'currentColor');
      rect.style.transformBox = 'fill-box';
      rect.style.transformOrigin = 'bottom';
      if (M.dur) rect.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: M.dur * 1.4, easing: M.ease, delay: i * 40 });
      svg.append(rect);

      const label = document.createElementNS(NS, 'text');
      label.setAttribute('x', i * slot + slot / 2);
      label.setAttribute('y', H - 4);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'lbl');
      label.textContent = d.label.slice(0, 6);
      svg.append(label);
    });
    return svg;
  }

  function blockEl(block, index) {
    switch (block.type) {
      case 'heading': return textBlock(block, index, true);
      case 'todo': return todoBlock(block, index);
      case 'tracker': return trackerBlock(block, index);
      case 'chart': return chartBlock(block, index);
      case 'divider': return wrap(block, index, el('hr', ''));
      default: return textBlock(block, index, false);
    }
  }

  function render() {
    if (!node) return;
    body.replaceChildren(...node.note.blocks.map((b, i) => blockEl(b, i)));
  }

  // Looks the task up again. Needed after another window changes the saved data.
  function refresh() {
    if (!nodeId) return;
    node = opts.getNode(nodeId);
    if (!node) return close();
    node.note = node.note || { blocks: [] };
    if (node.note.blocks.length === 0) node.note.blocks.push(makeBlock('text'));
    titleEl.textContent = node.text || 'Untitled';
    render();
  }

  function open(id, options) {
    nodeId = id;
    opts = options;
    popBtn.hidden = Boolean(opts.detached);
    win.classList.toggle('detached-note', Boolean(opts.detached));
    refresh();
    if (!node) return;
    win.hidden = false;
    const M = motion();
    if (M.dur) {
      win.animate(
        [{ opacity: 0, transform: 'translateY(16px) scale(0.96)' }, { opacity: 1, transform: 'none' }],
        { duration: M.dur, easing: M.ease },
      );
    }
    if (!opts.detached) return;
    focusBlock(node.note.blocks[0].id);
  }

  function close() {
    if (opts?.detached) {
      opts.closeWindow();
      return;
    }
    win.hidden = true;
    nodeId = null;
    node = null;
    opts = null;
  }

  // Add-block buttons.
  win.querySelectorAll('.note-add button').forEach(btn => {
    btn.onclick = () => {
      if (!node) return;
      insertAfter(node.note.blocks.length - 1, makeBlock(btn.dataset.type));
    };
  });

  // Dragging by the title bar. Letting go outside the app window pops the note out.
  const bar = win.querySelector('.note-bar');
  bar.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || opts?.detached) return;
    const rect = win.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    bar.setPointerCapture(e.pointerId);
    const move = ev => {
      win.style.left = `${ev.clientX - offX}px`;
      win.style.top = `${ev.clientY - offY}px`;
      win.style.right = 'auto';
      win.style.bottom = 'auto';
    };
    const up = ev => {
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      const outside = ev.clientX < 0 || ev.clientY < 0 || ev.clientX > window.innerWidth || ev.clientY > window.innerHeight;
      if (outside && opts?.onPopOut) popOut(ev.screenX, ev.screenY);
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
  });

  function popOut(x, y) {
    const id = nodeId;
    const callback = opts.onPopOut;
    close();
    callback(id, x, y);
  }

  popBtn.onclick = () => {
    if (!opts?.onPopOut) return;
    const r = win.getBoundingClientRect();
    popOut(window.screenX + r.left, window.screenY + r.top);
  };
  closeBtn.onclick = close;
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !win.hidden) close();
  });

  window.Todo.Notes = {
    open,
    close,
    refresh,
    isOpenFor: id => !win.hidden && nodeId === id,
  };
})();
