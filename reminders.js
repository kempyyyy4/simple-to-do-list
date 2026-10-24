// Reminders on tasks, the inbox tray that collects them when they're due, and toast alerts.
(() => {
  'use strict';

  const uid = () => Math.random().toString(36).slice(2, 10);
  const pad = n => String(n).padStart(2, '0');
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  // Value for <input type="datetime-local"> in local time.
  const localInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const fmt = at => new Date(at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  let pop = null;
  let tray = null;
  let trayOpen = false;

  function closePop() {
    pop?.remove();
    pop = null;
  }
  document.addEventListener('pointerdown', e => {
    if (pop && !pop.contains(e.target) && !e.target.closest('.rem-btn')) closePop();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });

  // Opens a small form under the bell button to add or remove reminders on one task.
  function openPopover(node, anchor, onChange) {
    closePop();
    const next = new Date(Date.now() + 60 * 60 * 1000);
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);

    pop = el('div', 'rem-pop');
    pop.append(el('div', 'rem-title', 'Remind me'));
    const when = el('input');
    when.type = 'datetime-local';
    when.value = localInput(next);
    when.min = localInput(new Date());
    const text = el('input');
    text.type = 'text';
    text.value = node.text || 'Follow up';
    text.placeholder = 'What to remember';
    const add = el('button', 'rem-add', 'Add reminder');
    add.type = 'button';
    const list = el('ul', 'rem-list');

    function drawList() {
      const items = (node.reminders || []).slice().sort((a, b) => a.at.localeCompare(b.at));
      list.replaceChildren(...items.map(r => {
        const li = el('li', r.fired ? 'fired' : '');
        li.append(el('span', 'rem-text', r.text), el('span', 'rem-when', fmt(r.at)));
        const del = el('button', 'rem-del', '×');
        del.type = 'button';
        del.title = 'Remove';
        del.onclick = () => {
          node.reminders = node.reminders.filter(x => x.id !== r.id);
          onChange();
          drawList();
        };
        li.append(del);
        return li;
      }));
      if (!items.length) list.append(el('li', 'rem-empty', 'No reminders on this task yet.'));
    }

    add.onclick = async () => {
      if (!when.value) return;
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission().catch(() => {});
      }
      node.reminders = [...(node.reminders || []), {
        id: uid(), at: when.value, text: text.value.trim() || node.text || 'Reminder', fired: false,
      }];
      onChange();
      drawList();
    };

    pop.append(when, text, add, list);
    document.body.append(pop);

    const r = anchor.getBoundingClientRect();
    const width = pop.offsetWidth;
    pop.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - width - 8))}px`;
    pop.style.top = `${Math.min(r.bottom + 6, window.innerHeight - pop.offsetHeight - 8)}px`;
    drawList();
  }

  // Moves any reminders that are now due into the inbox. Returns the new inbox items.
  function checkDue(tree, inbox, now = Date.now()) {
    const fired = [];
    (function walk(node, names) {
      for (const child of node.children) {
        const labels = [...names, child.text || 'Untitled'];
        for (const r of child.reminders || []) {
          if (!r.fired && new Date(r.at).getTime() <= now) {
            r.fired = true;
            const item = { id: uid(), nodeId: child.id, label: labels.join(' / '), text: r.text, at: r.at, read: false };
            inbox.unshift(item);
            fired.push(item);
          }
        }
        walk(child, labels);
      }
    })(tree, []);
    return fired;
  }

  function notify(item) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      new Notification(item.text, { body: item.label });
    } catch {}
  }

  function toast(item, onView) {
    let stack = document.getElementById('toasts');
    if (!stack) {
      stack = el('div', 'toasts');
      stack.id = 'toasts';
      document.body.append(stack);
    }
    const t = el('div', 'toast');
    const body = el('div', 'toast-body');
    body.append(el('strong', '', item.text), el('span', 'toast-sub', item.label));
    const view = el('button', 'toast-view', 'View');
    view.onclick = () => { onView(item.nodeId); t.remove(); };
    const close = el('button', 'toast-x', '×');
    close.onclick = () => t.remove();
    t.append(body, view, close);
    stack.append(t);
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 400);
    }, 9000);
    notify(item);
  }

  // The inbox tray. Collapsed it shows a count. Expanded it lists due reminders.
  function renderTray(inbox, handlers) {
    if (!tray) {
      tray = el('section', 'tray');
      tray.id = 'tray';
      document.body.append(tray);
    }
    const unread = inbox.filter(i => !i.read).length;
    const bar = el('button', 'tray-bar');
    bar.type = 'button';
    bar.append(el('span', '', 'Inbox'), el('span', `badge${unread ? ' on' : ''}`, String(unread || inbox.length || '')));
    bar.onclick = () => {
      trayOpen = !trayOpen;
      if (trayOpen) handlers.markAllRead();
      renderTray(inbox, handlers);
    };

    const items = el('div', 'tray-items');
    if (!inbox.length) items.append(el('p', 'tray-empty', 'Nothing here. Due reminders land in this inbox.'));
    inbox.forEach(item => {
      const row = el('div', `tray-item${item.read ? '' : ' unread'}`);
      const info = el('div', 'tray-info');
      info.append(el('strong', '', item.text), el('span', 'tray-sub', `${item.label} · ${fmt(item.at)}`));
      const open = el('button', 'tray-open', 'Open');
      open.onclick = () => handlers.open(item.nodeId);
      const done = el('button', 'tray-done', '✓');
      done.title = 'Dismiss';
      done.onclick = () => handlers.dismiss(item.id);
      row.append(info, open, done);
      items.append(row);
    });
    if (inbox.length) {
      const clear = el('button', 'tray-clear', 'Clear all');
      clear.onclick = () => handlers.clear();
      items.append(clear);
    }

    const body = el('div', 'tray-body');
    body.append(items);
    tray.replaceChildren(bar, body);
    tray.classList.toggle('open', trayOpen);
  }

  window.Todo.Reminders = { openPopover, checkDue, toast, renderTray, closePop };
})();
