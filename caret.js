// Custom text cursors for single-line inputs.
// "default" leaves the browser's own caret alone. "coder" is a blinking block over the next
// character. "smooth" is a thin bar that glides between positions.
(() => {
  'use strict';

  const caret = document.createElement('div');
  caret.className = 'caret';
  caret.hidden = true;
  document.body.append(caret);

  let style = 'default';
  let target = null;
  const ctx = document.createElement('canvas').getContext('2d');

  function isTextInput(node) {
    return node instanceof HTMLInputElement && (node.type === 'text' || node.type === '');
  }

  // Works out where the caret sits by measuring the text before it in the input's own font.
  function position(input) {
    const cs = getComputedStyle(input);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const at = input.selectionStart ?? input.value.length;
    const before = ctx.measureText(input.value.slice(0, at)).width;
    const next = ctx.measureText(input.value.charAt(at) || 'M').width;
    const rect = input.getBoundingClientRect();
    const padLeft = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
    const height = parseFloat(cs.fontSize) * 1.3;
    return {
      x: rect.left + padLeft + before - input.scrollLeft,
      y: rect.top + (rect.height - height) / 2,
      w: Math.max(next, 8),
      h: height,
    };
  }

  function update() {
    if (style === 'default' || !target || !target.isConnected || document.activeElement !== target) {
      caret.hidden = true;
      return;
    }
    const p = position(target);
    const wasHidden = caret.hidden;
    caret.hidden = false;
    caret.dataset.style = style;
    caret.style.left = `${p.x}px`;
    caret.style.top = `${p.y}px`;
    caret.style.height = `${p.h}px`;
    caret.style.width = style === 'coder' ? `${p.w}px` : '2px';
    if (wasHidden) {
      caret.classList.add('instant');
      requestAnimationFrame(() => requestAnimationFrame(() => caret.classList.remove('instant')));
    }
  }

  function setTargetCaret(input, hide) {
    if (!input) return;
    input.style.caretColor = hide ? 'transparent' : '';
  }

  document.addEventListener('focusin', e => {
    if (!isTextInput(e.target)) return;
    target = e.target;
    setTargetCaret(target, style !== 'default');
    update();
  });

  document.addEventListener('focusout', e => {
    if (e.target !== target) return;
    setTargetCaret(target, false);
    target = null;
    caret.hidden = true;
  });

  // Typing, moving with arrows, clicking and selecting all move the caret.
  ['input', 'keyup', 'click', 'pointerup'].forEach(type => document.addEventListener(type, update));
  document.addEventListener('selectionchange', update);
  window.addEventListener('resize', update);
  document.addEventListener('scroll', update, true);

  window.Todo.Caret = {
    setStyle(next) {
      style = next;
      setTargetCaret(target, style !== 'default');
      update();
    },
  };
})();
