// A floating notepad for one task. Blocks are headings, text and to-dos.
// The note is stored on the task as node.note = { blocks: [...] }.
// Drag the title bar outside the app window and the note tears off into its own window.
(() => {
  'use strict';

  const win = document.getElementById('noteWin');
  const body = document.getElementById('noteBody');
  const titleEl = document.getElementById('noteTitle');
  const popBtn = document.getElementById('notePop');
  const pinBtn = document.getElementById('notePin');
  const closeBtn = document.getElementById('noteClose');

  const KINDS = ['text', 'heading', 'todo'];

  let nodeId = null;
  let opts = null;
  let node = null;
  let pinned = false;

  const uid = () => Math.random().toString(36).slice(2, 10);

  function makeBlock(type) {
    const base = { id: uid(), type };
    return type === 'todo' ? { ...base, text: '', checked: false } : { ...base, text: '' };
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

  // Heading and text share one editable block. The heading just looks bigger.
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

  function blockEl(block, index) {
    if (block.type === 'heading') return textBlock(block, index, true);
    if (block.type === 'todo') return todoBlock(block, index);
    return textBlock(block, index, false);
  }

  function render() {
    if (!node) return;
    body.replaceChildren(...node.note.blocks.map((b, i) => blockEl(b, i)));
  }

  // Looks the task up again. Needed after another window changes the saved data.
  // Blocks from older notes (trackers, charts, dividers) are dropped.
  function refresh() {
    if (!nodeId) return;
    node = opts.getNode(nodeId);
    if (!node) return close();
    node.note = node.note || { blocks: [] };
    node.note.blocks = node.note.blocks.filter(b => KINDS.includes(b.type));
    if (node.note.blocks.length === 0) node.note.blocks.push(makeBlock('text'));
    titleEl.textContent = node.text || 'Untitled';
    render();
  }

  function open(id, options) {
    nodeId = id;
    opts = options;
    popBtn.hidden = Boolean(opts.detached);
    // Pinning only makes sense for a note in its own window in the desktop app.
    const canPin = Boolean(window.desktop && opts.detached);
    pinBtn.hidden = !canPin;
    pinned = false;
    pinBtn.classList.remove('on');
    win.style.opacity = '';
    win.classList.toggle('detached-note', Boolean(opts.detached));
    refresh();
    if (!node) return;
    win.hidden = false;
    const M = opts.motion();
    if (M.dur) {
      win.animate(
        [{ opacity: 0, transform: 'translateY(16px) scale(0.96)' }, { opacity: 1, transform: 'none' }],
        { duration: M.dur, easing: M.ease },
      );
    }
    if (opts.detached) focusBlock(node.note.blocks[0].id);
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

  // Dragging by the title bar. Dragging out of the app window tears the note off into its own window.
  const bar = win.querySelector('.note-bar');
  const isOutside = ev => ev.clientX < 0 || ev.clientY < 0 || ev.clientX > window.innerWidth || ev.clientY > window.innerHeight;
  bar.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || opts?.detached) return;
    const rect = win.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    const tear = opts.tearOff;
    let torn = false;
    bar.setPointerCapture(e.pointerId);
    const move = ev => {
      if (torn) return;
      if (tear && isOutside(ev)) {
        // The new window takes over the drag, so hide this copy but keep the pointer captured.
        torn = true;
        win.style.opacity = '0';
        tear.start(nodeId, Math.round(offX), Math.round(offY), Math.round(rect.width), Math.round(rect.height));
        return;
      }
      win.style.left = `${ev.clientX - offX}px`;
      win.style.top = `${ev.clientY - offY}px`;
      win.style.right = 'auto';
      win.style.bottom = 'auto';
    };
    const up = ev => {
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      if (torn) {
        tear.end();
        close();
        return;
      }
      if (isOutside(ev) && opts?.onPopOut) popOut(ev.screenX, ev.screenY);
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

  // Keeps this note window above other windows, the same as the Pin button on the main list.
  pinBtn.onclick = () => {
    pinned = !pinned;
    window.desktop.setAlwaysOnTop(pinned);
    pinBtn.classList.toggle('on', pinned);
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
