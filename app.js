(() => {
  'use strict';

  // Motion presets. Each one drives both the JS animations and the CSS easing.
  const MOTION = {
    off: { dur: 0, ease: 'linear', enter: [], exit: [], nav: 0, pop: false, burst: false },
    chess: {
      dur: 240, ease: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      enter: [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }],
      exit: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-24px)' }],
      nav: 16, pop: false, burst: false,
    },
    retro: {
      dur: 480, ease: 'steps(6, end)',
      enter: [{ opacity: 0, transform: 'translateX(-30px)' }, { opacity: 1, transform: 'none' }],
      exit: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(30px)' }],
      nav: 30, pop: false, burst: false,
    },
    arcade: {
      dur: 380, ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      enter: [{ opacity: 0, transform: 'translateY(-14px) scale(0.92)' }, { opacity: 1, transform: 'none' }],
      exit: [
        { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' },
        { transform: 'translateX(-4px)' }, { transform: 'scale(0.9)', opacity: 0 },
      ],
      nav: 26, pop: true, burst: true,
    },
  };

  const LS_TREE = 'todo-tree-v1';
  const LS_SETTINGS = 'todo-settings-v1';
  const DEFAULT_SETTINGS = { theme: 'sepia', font: 'mono', anim: 'chess', accent: null };

  const desktop = window.desktop; // only present inside the Electron app

  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const newNode = (type, text = '') => ({ id: uid(), type, text, done: false, tracked: false, log: {}, children: [] });
  const motion = () => MOTION[settings.anim] || MOTION.chess;

  // Local date as YYYY-MM-DD, so a day ticks over at local midnight.
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  // Fills in fields that older saves don't have.
  function normalize(node) {
    node.type = node.type === 'folder' ? 'folder' : 'task';
    node.done = Boolean(node.done);
    node.tracked = Boolean(node.tracked);
    node.log = node.log || {};
    node.children = (node.children || []).map(normalize);
    return node;
  }

  // Electron keeps everything in a JSON file (see main.js). The browser uses localStorage.
  const saved = desktop ? (desktop.loadData() || {}) : { tree: readJSON(LS_TREE), settings: readJSON(LS_SETTINGS) };
  let root = normalize(saved.tree || { id: 'root', text: '', children: [] });
  root.id = 'root';
  root.type = 'folder';
  let settings = { ...DEFAULT_SETTINGS, ...(saved.settings || {}) };

  function save() {
    if (desktop) desktop.saveData({ tree: root, settings });
    else {
      writeJSON(LS_TREE, root);
      writeJSON(LS_SETTINGS, settings);
    }
  }
  // Flush synchronously when the window closes, so the last change always lands on disk.
  if (desktop) window.addEventListener('pagehide', () => desktop.saveDataSync({ tree: root, settings }));

  let todayKey = keyOf(new Date());
  let path = [];                  // ids from the root down to the list being viewed
  let view = 'list';              // 'list' or 'progress'
  let kind = 'task';              // what the composer creates: 'task' or 'folder'
  const now = new Date();
  let viewMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // One-shot UI flags, consumed by the next render.
  // `after` holds animations that must wait until the new rows are in the page.
  const ui = { focus: null, enter: null, pop: null, nav: 0, focusAdd: true, after: [] };

  // Walks the saved path and returns the nodes from root to current.
  // Stops early if a folder in the path was deleted.
  function trail() {
    const nodes = [root];
    for (const id of path) {
      const next = nodes.at(-1).children.find(n => n.id === id);
      if (!next) break;
      nodes.push(next);
    }
    path = nodes.slice(1).map(n => n.id);
    return nodes;
  }

  // ---- Animation helpers -------------------------------------------------

  function animateIn(target) {
    const M = motion();
    if (M.dur) target.animate(M.enter, { duration: M.dur, easing: M.ease });
  }

  function removeNode(siblings, index, li, nextFocus) {
    if (li.dataset.removing) return;
    li.dataset.removing = '1';
    const finish = () => {
      const at = siblings.findIndex(n => n.id === li.dataset.id);
      if (at >= 0) siblings.splice(at, 1);
      save();
      ui.focus = nextFocus || null;
      render();
    };
    const M = motion();
    if (!M.dur) return finish();
    li.animate(M.exit, { duration: M.dur, easing: M.ease, fill: 'forwards' }).finished.then(finish, finish);
  }

  function pop(target) {
    if (motion().pop) {
      target.animate(
        [{ transform: 'scale(0.7)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
        { duration: 420, easing: 'ease-out' },
      );
    }
  }

  // Arcade only: a burst of sparks from a checkbox.
  function celebrate(target) {
    if (!motion().burst) return;
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const accent2 = getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim() || accent;
    const colours = [accent, accent2, '#ffffff'];
    for (let i = 0; i < 18; i++) {
      const spark = el('span', 'spark');
      spark.style.background = colours[i % colours.length];
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      document.body.append(spark);
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 40;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 10;
      spark.animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.4) rotate(${dx * 4}deg)`, opacity: 0 },
        ],
        { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
      ).onfinish = () => spark.remove();
    }
  }

  // ---- Progress tracking -------------------------------------------------

  function setDay(node, key, on) {
    if (on) node.log[key] = true;
    else delete node.log[key];
    save();
  }

  // Consecutive days worked, counting back from today. Today can still be unticked without breaking the streak.
  function streakOf(node) {
    const d = new Date();
    if (!node.log[keyOf(d)]) d.setDate(d.getDate() - 1);
    let count = 0;
    while (node.log[keyOf(d)]) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }

  function collectTracked(node, names = [], out = []) {
    for (const child of node.children) {
      const labels = [...names, child.text || 'Untitled'];
      if (child.type === 'task' && child.tracked) out.push({ node: child, label: labels.join(' / ') });
      collectTracked(child, labels, out);
    }
    return out;
  }

  // Keeps "today" in step with the clock, so the app is right after midnight or a wake-up.
  function checkDay() {
    const key = keyOf(new Date());
    if (key === todayKey) return;
    todayKey = key;
    render();
  }
  setInterval(checkDay, 15000);
  window.addEventListener('focus', checkDay);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDay(); });

  // ---- Rendering ---------------------------------------------------------

  function renderCrumbs(nodes) {
    const crumbs = $('crumbs');
    crumbs.textContent = '';
    nodes.forEach((node, i) => {
      if (i > 0) crumbs.append(el('span', 'sep', '/'));
      const isLast = i === nodes.length - 1;
      const btn = el('button', isLast ? 'current' : '', i === 0 ? 'All tasks' : (node.text || 'Untitled'));
      btn.onclick = () => go(nodes.slice(1, i + 1).map(n => n.id), isLast ? 0 : -1);
      crumbs.append(btn);
    });
  }

  function buildRow(node, siblings, index) {
    const isFolder = node.type === 'folder';
    const li = el('li', `row${isFolder ? ' folder' : ''}${node.done ? ' done' : ''}`);
    li.dataset.id = node.id;

    if (isFolder) {
      li.append(el('span', 'folder-ico'));
    } else {
      const check = el('input');
      check.type = 'checkbox';
      check.checked = node.done;
      check.title = 'Mark done';
      check.onchange = () => {
        node.done = check.checked;
        save();
        if (node.done) celebrate(check);
        ui.pop = `done:${node.id}`;
        render();
      };
      li.append(check);
      if (ui.pop === `done:${node.id}`) ui.after.push(() => pop(check));
    }

    const text = el('input', 'text');
    text.value = node.text;
    text.placeholder = isFolder ? 'Untitled folder' : 'Untitled';
    text.oninput = () => { node.text = text.value; save(); };
    text.onkeydown = e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const next = newNode(node.type);
        siblings.splice(index + 1, 0, next);
        save();
        ui.focus = next.id;
        ui.enter = next.id;
        render();
      } else if (e.key === 'Backspace' && text.value === '') {
        e.preventDefault();
        removeNode(siblings, index, li, siblings[index - 1]?.id);
      }
    };
    li.append(text);

    if (!isFolder && node.tracked) {
      const streak = streakOf(node);
      const streakEl = el('span', 'streak', streak ? `${streak}d` : '');
      streakEl.title = 'Current streak';
      li.append(streakEl);

      const today = el('input', 'today');
      today.type = 'checkbox';
      today.checked = Boolean(node.log[todayKey]);
      today.title = 'Worked on this today';
      today.onchange = () => {
        setDay(node, todayKey, today.checked);
        ui.pop = `today:${node.id}`;
        render();
      };
      li.append(today);
      if (ui.pop === `today:${node.id}`) ui.after.push(() => pop(today));
    }

    if (!isFolder) {
      const track = el('button', `track${node.tracked ? ' on' : ''}`, '◎');
      track.title = node.tracked ? 'Stop tracking' : 'Track day by day';
      track.onclick = () => { node.tracked = !node.tracked; save(); render(); };
      li.append(track);
    }

    const open = el('button', 'open');
    open.title = isFolder ? 'Open folder' : 'Open sub-list';
    open.append(el('span', 'count', node.children.length ? String(node.children.length) : ''), '›');
    open.onclick = () => go([...path, node.id], 1);
    li.append(open);

    const del = el('button', 'del', '×');
    del.title = 'Delete';
    del.onclick = () => removeNode(siblings, index, li, null);
    li.append(del);

    if (ui.enter === node.id) ui.after.push(() => animateIn(li));
    return li;
  }

  function renderList(current) {
    const list = $('list');
    list.textContent = '';
    current.children.forEach((node, i) => list.append(buildRow(node, current.children, i)));
    $('empty').hidden = current.children.length > 0;

    const tasks = current.children.filter(n => n.type === 'task');
    const folders = current.children.length - tasks.length;
    const parts = [];
    if (folders) parts.push(`${folders} folder${folders === 1 ? '' : 's'}`);
    if (tasks.length) parts.push(`${tasks.filter(n => n.done).length} of ${tasks.length} done`);
    $('summary').textContent = parts.join(' · ');
  }

  function renderProgress() {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    const monthPrefix = `${y}-${pad(m + 1)}-`;
    $('monthLabel').textContent = viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const tracked = collectTracked(root);
    $('trackEmpty').hidden = tracked.length > 0;
    $('gridWrap').hidden = tracked.length === 0;

    const grid = $('grid');
    grid.textContent = '';
    const head = el('tr');
    head.append(el('th', 'name', 'Task'));
    let todayTh = null;
    for (let d = 1; d <= days; d++) {
      const th = el('th', 'day', String(d));
      if (`${monthPrefix}${pad(d)}` === todayKey) {
        th.classList.add('today');
        todayTh = th;
      }
      head.append(th);
    }
    const thead = el('thead');
    thead.append(head);
    const tbody = el('tbody');
    grid.append(thead, tbody);

    for (const { node, label } of tracked) {
      const tr = el('tr');
      const name = el('td', 'name');
      name.append(el('span', 'label', label));
      const monthCount = Object.keys(node.log).filter(k => k.startsWith(monthPrefix)).length;
      name.append(el('span', 'meta', `${streakOf(node)}d streak · ${monthCount} this month`));
      tr.append(name);

      for (let d = 1; d <= days; d++) {
        const key = `${monthPrefix}${pad(d)}`;
        const on = Boolean(node.log[key]);
        const future = key > todayKey;
        const cell = el('td', 'cell');
        if (on) cell.classList.add('on');
        if (key === todayKey) cell.classList.add('today');
        if (future) cell.classList.add('future');
        const btn = el('button');
        btn.title = `${label} · ${key}`;
        btn.onclick = () => {
          if (future) return;
          setDay(node, key, !on);
          render();
        };
        cell.append(btn);
        tr.append(cell);
      }
      tbody.append(tr);
    }

    // Bring today's column into view when the calendar opens on the current month.
    if (todayTh) {
      requestAnimationFrame(() => {
        const wrap = $('gridWrap');
        const offset = todayTh.getBoundingClientRect().left - wrap.getBoundingClientRect().left;
        wrap.scrollLeft += offset - wrap.clientWidth / 2;
      });
    }
  }

  function render() {
    const nodes = trail();
    const current = nodes.at(-1);
    const dir = ui.nav;
    ui.nav = 0;

    renderCrumbs(nodes);
    $('progressBtn').textContent = view === 'progress' ? 'Tasks' : 'Progress';
    $('progressBtn').classList.toggle('on', view === 'progress');

    const title = $('pageTitle');
    title.hidden = nodes.length === 1;
    if (document.activeElement !== title) title.value = current.text;

    $('listView').hidden = view !== 'list';
    $('progressView').hidden = view !== 'progress';
    if (view === 'list') renderList(current);
    else renderProgress();

    const M = motion();
    if (dir && M.nav) {
      const section = view === 'list' ? $('listView') : $('progressView');
      section.animate(
        [{ opacity: 0, transform: `translateX(${dir * M.nav}px)` }, { opacity: 1, transform: 'none' }],
        { duration: M.dur, easing: M.ease },
      );
    }

    if (ui.focusAdd && view === 'list') $('add').focus();
    ui.focusAdd = false;

    if (ui.focus) {
      const input = $('list').querySelector(`[data-id="${ui.focus}"] .text`);
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
    ui.after.splice(0).forEach(fn => fn());
    ui.focus = null;
    ui.enter = null;
    ui.pop = null;
  }

  // Moves to a folder or task's list. Puts the cursor in the composer so you can type straight away.
  function go(newPath, dir) {
    path = newPath;
    view = 'list';
    ui.nav = dir;
    ui.focusAdd = true;
    render();
  }

  // ---- Wiring ------------------------------------------------------------

  $('pageTitle').oninput = e => {
    const nodes = trail();
    nodes.at(-1).text = e.target.value;
    save();
    renderCrumbs(nodes);
  };
  $('pageTitle').onkeydown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      $('add').focus();
    }
  };

  $('add').onkeydown = e => {
    const value = e.target.value.trim();
    if (e.key !== 'Enter' || !value) return;
    const current = trail().at(-1);
    const node = newNode(kind, value);
    current.children.push(node);
    e.target.value = '';
    save();
    ui.enter = node.id;
    render();
  };

  document.querySelectorAll('.kind button').forEach(btn => {
    btn.onclick = () => {
      kind = btn.dataset.kind;
      document.querySelectorAll('.kind button').forEach(b => b.classList.toggle('active', b === btn));
      $('add').placeholder = kind === 'folder' ? 'New folder, Enter to add' : 'New task, Enter to add';
      $('add').focus();
    };
  });

  $('progressBtn').onclick = () => {
    view = view === 'progress' ? 'list' : 'progress';
    ui.nav = 1;
    ui.focusAdd = view === 'list';
    checkDay();
    render();
  };
  $('prevMonth').onclick = () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
    render();
  };
  $('nextMonth').onclick = () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    render();
  };
  $('thisMonth').onclick = () => {
    const t = new Date();
    viewMonth = new Date(t.getFullYear(), t.getMonth(), 1);
    render();
  };

  // ---- Settings ----------------------------------------------------------

  function applySettings() {
    const html = document.documentElement;
    html.dataset.theme = settings.theme;
    html.dataset.font = settings.font;
    html.dataset.anim = settings.anim;
    if (settings.accent) html.style.setProperty('--accent', settings.accent);
    else html.style.removeProperty('--accent');

    const accent = getComputedStyle(html).getPropertyValue('--accent').trim();
    $('theme').value = settings.theme;
    $('font').value = settings.font;
    $('anim').value = settings.anim;
    $('accent').value = /^#[0-9a-f]{6}$/i.test(accent) ? accent : '#000000';
  }

  function applyAndSave() {
    applySettings();
    save();
  }

  function toggleSettings(force) {
    const panel = $('settings');
    const show = force ?? panel.hidden;
    panel.hidden = !show;
    if (show && motion().dur) {
      panel.animate(
        [{ opacity: 0, transform: 'translateY(-8px) scale(0.97)' }, { opacity: 1, transform: 'none' }],
        { duration: motion().dur, easing: motion().ease },
      );
    }
  }

  $('settingsBtn').onclick = () => toggleSettings();
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleSettings(false); });
  $('theme').onchange = e => {
    settings.theme = e.target.value;
    settings.accent = null; // each theme keeps its own default accent unless you pick one
    applyAndSave();
  };
  $('font').onchange = e => { settings.font = e.target.value; applyAndSave(); };
  $('anim').onchange = e => { settings.anim = e.target.value; applyAndSave(); };
  $('accent').oninput = e => { settings.accent = e.target.value; applyAndSave(); };
  $('accentReset').onclick = () => { settings.accent = null; applyAndSave(); };

  $('exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(root, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'todo-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  $('importFile').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.children)) throw new Error('Not a to-do backup');
      root = normalize(data);
      root.id = 'root';
      root.type = 'folder';
      path = [];
      save();
      ui.focusAdd = true;
      render();
    } catch (err) {
      alert('Could not import that file: ' + err.message);
    }
    e.target.value = '';
  };

  // Desktop-only controls (exposed by preload.js in the Electron build).
  if (desktop) {
    const pinBtn = $('pinBtn');
    pinBtn.hidden = false;
    $('closeBtn').hidden = false;
    let pinned = false;
    pinBtn.onclick = () => {
      pinned = !pinned;
      desktop.setAlwaysOnTop(pinned);
      pinBtn.textContent = pinned ? 'Pinned' : 'Pin';
    };
    $('closeBtn').onclick = () => desktop.close();
  }

  applySettings();
  render();
})();
