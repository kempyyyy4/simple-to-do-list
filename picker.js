// A dropdown where every option is drawn in its own style, for example each font name in its font.
// Native <select> menus can't do that reliably, so this one is built from buttons.
(() => {
  'use strict';

  let openPicker = null;

  document.addEventListener('pointerdown', e => {
    if (openPicker && !openPicker.el.contains(e.target)) openPicker.close();
  });

  // items: [{ value, label, style?, swatch? }]. swatch is an optional array of colours.
  function create({ items, value, onChange }) {
    const root = document.createElement('div');
    root.className = 'picker';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'picker-btn';
    const list = document.createElement('div');
    list.className = 'picker-list';
    list.hidden = true;

    const swatchEl = it => {
      const wrap = document.createElement('span');
      wrap.className = 'picker-swatch';
      (it.swatch || []).forEach(c => {
        const dot = document.createElement('i');
        dot.style.background = c;
        wrap.append(dot);
      });
      return wrap;
    };
    const labelEl = it => {
      const span = document.createElement('span');
      span.className = 'picker-label';
      span.textContent = it.label;
      if (it.style) span.style.cssText = it.style;
      return span;
    };

    function setValue(v) {
      const it = items.find(i => i.value === v) || items[0];
      button.replaceChildren(swatchEl(it), labelEl(it));
      list.querySelectorAll('.picker-item').forEach(b => b.classList.toggle('active', b.dataset.value === it.value));
    }

    items.forEach(it => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'picker-item';
      option.dataset.value = it.value;
      option.append(swatchEl(it), labelEl(it));
      option.onclick = () => {
        api.close();
        setValue(it.value);
        onChange(it.value);
      };
      list.append(option);
    });

    const api = {
      el: root,
      setValue,
      open() {
        if (openPicker && openPicker !== api) openPicker.close();
        list.hidden = false;
        openPicker = api;
        list.querySelector('.picker-item.active')?.scrollIntoView({ block: 'nearest' });
      },
      close() {
        list.hidden = true;
        if (openPicker === api) openPicker = null;
      },
    };

    button.onclick = () => (list.hidden ? api.open() : api.close());
    root.append(button, list);
    setValue(value);
    return api;
  }

  window.Todo.Picker = { create };
})();
