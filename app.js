(() => {
  'use strict';

  const {
    BUILTIN_THEMES, DEFAULT_THEME_ID, WORDS, applyTheme, normalizeTheme, fontStack,
    Caret, Pong, Notes, Reminders, Customise,
  } = window.Todo;

  // Motion presets. Durations are base values in ms; the Animation length setting scales them.
  const MOTION = {
    off: { dur: 0, ease: 'linear', enter: [], exit: [], nav: 0, pop: false, burst: false },
    chess: {
      dur: 420, ease: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      enter: [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }],
      exit: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-28px)' }],
      nav: 22, pop: false, burst: false,
    },
    retro: {
      dur: 760, ease: 'steps(8, end)',
      enter: [{ opacity: 0, transform: 'translateX(-36px)' }, { opacity: 1, transform: 'none' }],
      exit: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(36px)' }],
      nav: 36, pop: false, burst: false,
    },
    arcade: {
      dur: 640, ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      enter: [{ opacity: 0, transform: 'translateY(-16px) scale(0.92)' }, { opacity: 1, transform: 'none' }],
      exit: [
        { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' },
        { transform: 'translateX(-4px)' }, { transform: 'scale(0.9)', opacity: 0 },
      ],
      nav: 30, pop: true, burst: true,
    },
  };

  const KEY = 'todo-state-v2';
  const DEFAULT_SETTINGS = { themeId: DEFAULT_THEME_ID, anim: 'chess', speed: 1, caret: 'default', words: true };
  // Theme ids that were renamed or removed.
  const THEME_ALIASES = { sepia: 'default' };

  const desktop = window.desktop; // only present inside the Electron app
  const detachedId = new URLSearchParams(location.search).get('note'); // set in a popped-out note window

  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const newNode = (type, text = '') => ({ id: uid(), type, text, done: false, tracked: false, log: {}, children: [] });

  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  // Fills in fields that older saves don't have.
  function normalizeTree(node) {
    node.type = node.type === 'folder' ? 'folder' : 'task';
    node.done = Boolean(node.done);
    node.tracked = Boolean(node.tracked);
    node.log = node.log || {};
    node.children = (node.children || []).map(normalizeTree);
    return node;
  }

  // ---- State -------------------------------------------------------------

  let root;          // the task tree
  let settings;      // theme choice, motion, cursor, prompts
  let customThemes;  // themes the user made
  let inbox;         // reminders that have come due

  // Takes a saved object (any version) and sets the live state from it.
  function adopt(raw) {
    raw = raw || {};
    root = normalizeTree(raw.tree || { id: 'root', text: '', children: [] });
    root.id = 'root';
    root.type = 'folder';

    const s = raw.settings || {};
    settings = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (s[key] !== undefined) settings[key] = s[key];
    }
    if (!s.themeId && s.theme) settings.themeId = s.theme; // first version stored the theme as "theme"
    settings.themeId = THEME_ALIASES[settings.themeId] || settings.themeId;

    customThemes = (raw.themes || []).map(t => normalizeTheme(t, false));
    inbox = raw.inbox || [];
  }

  function loadInitial() {
    if (desktop) return desktop.loadData() || {};
    const current = readJSON(KEY);
    if (current) return current;
    // Migrate the first version's keys.
    return { tree: readJSON('todo-tree-v1'), settings: readJSON('todo-settings-v1') };
  }

  function snapshot() {
    return { tree: root, settings, themes: customThemes, inbox };
  }

  // Saves are batched. Typing used to write the whole file on every key, which made things sluggish.
  let saveTimer = null;
  let dirty = false;

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!dirty) return;
    dirty = false;
    if (desktop) desktop.saveData(snapshot());
    else writeJSON(KEY, snapshot());
  }

  function save() {
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 250);
  }

  // Other windows can change the saved data while this one is being edited.
  // Wait until focus leaves the editable field, so typing never gets overwritten.
  let pending = null;

  function isEditing() {
    const a = document.activeElement;
    return Boolean(a && (a.isContentEditable || a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT'));
  }

  function onExternal(data) {
    if (isEditing()) {
      pending = data;
      return;
    }
    adopt(data);
    refreshAll();
  }

  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!pending || isEditing()) return;
      const data = pending;
      pending = null;
      if (dirty) persist(); // our own unsaved edits are newer, so keep them
      else {
        adopt(data);
        refreshAll();
      }
    }, 0);
  });

  if (desktop) {
    desktop.onState(onExternal);
  } else {
    window.addEventListener('storage', e => {
      if (e.key === KEY && e.newValue) onExternal(JSON.parse(e.newValue));
    });
  }
  // Flush any unsaved change when a window closes, so the last edit always lands on disk.
  window.addEventListener('pagehide', () => {
    if (!dirty) return;
    dirty = false;
    clearTimeout(saveTimer);
    if (desktop) desktop.saveDataSync(snapshot());
    else writeJSON(KEY, snapshot());
  });

  const themes = () => [...BUILTIN_THEMES, ...customThemes];
  const activeTheme = () => themes().find(t => t.id === settings.themeId) || BUILTIN_THEMES.find(t => t.id === DEFAULT_THEME_ID);
  const motion = () => MOTION[settings.anim] || MOTION.chess;
  // Motion with the Animation length setting applied. Used by the JS animations.
  const timing = () => {
    const M = motion();
    return { ...M, dur: M.dur * settings.speed };
  };

  let todayKey = keyOf(new Date());
  let path = [];                  // ids from the root down to the list being viewed
  let view = 'list';              // 'list' or 'progress'
  let kind = 'task';              // what the composer creates: 'task' or 'folder'
  let mode = 'month';             // progress view: 'month' or 'year'
  const now = new Date();
  let viewMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let viewYear = now.getFullYear();

  // One-shot UI flags, consumed by the next render.
  // `after` holds animations that must wait until the new rows are in the page.
  const ui = { focus: null, enter: null, pop: null, nav: 0, focusAdd: true, after: [] };

  function findNode(node, id) {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }
  const findById = id => findNode(root, id);

  function findPath(id, node = root, acc = []) {
    for (const child of node.children) {
      if (child.id === id) return [...acc, child.id];
      const found = findPath(id, child, [...acc, child.id]);
      if (found) return found;
    }
    return null;
  }

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

  // ---- Apply and sync ----------------------------------------------------

  // --k scales every CSS transition. It is 0 when animation is off, so changes are instant.
  function applyScale(value) {
    const k = value ?? (settings.anim === 'off' ? '0' : String(settings.speed));
    document.documentElement.style.setProperty('--k', String(k));
  }

  function syncSettingsControls() {
    $('theme').value = settings.themeId;
    $('anim').value = settings.anim;
    $('speed').value = settings.speed;
    $('speedVal').textContent = `${Math.round(settings.speed * 100)}%`;
    $('caret').value = settings.caret;
    $('words').checked = settings.words;
  }

  function fillThemeSelect() {
    $('theme').replaceChildren(...themes().map(t => new Option(t.name, t.id)));
  }

  function applyAll() {
    applyTheme(activeTheme());
    document.documentElement.dataset.anim = settings.anim;
    applyScale();
    Caret.setStyle(settings.caret);
    fillThemeSelect();
    syncSettingsControls();
  }

  // Saves whatever changed and repaints the theme. Called after every edit.
  function touch() {
    applyAll();
    save();
  }

  // Takes a theme's motion and cursor into Settings. Settings can still change them afterwards.
  function applyMotion() {
    const t = activeTheme();
    settings.anim = t.motion.anim;
    settings.speed = t.motion.speed;
    settings.caret = t.motion.caret;
    touch();
  }

  function activate(id) {
    settings.themeId = id;
    applyMotion();
    Customise.refresh();
  }

  function refreshAll() {
    applyAll();
    render();
    Notes.refresh();
    Customise.refresh();
  }

  // ---- Animation helpers -------------------------------------------------

  function animateIn(target) {
    const M = timing();
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
    const M = timing();
    if (!M.dur) return finish();
    li.animate(M.exit, { duration: M.dur, easing: M.ease, fill: 'forwards' }).finished.then(finish, finish);
  }

  function pop(target) {
    if (timing().pop) {
      target.animate(
        [{ transform: 'scale(0.7)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
        { duration: 520 * settings.speed, easing: 'ease-out' },
      );
    }
  }

  // Arcade only: a burst of sparks from a checkbox.
  function celebrate(target) {
    if (!timing().burst) return;
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--accent').trim();
    const accent2 = styles.getPropertyValue('--accent2').trim() || accent;
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
        { duration: (900 + Math.random() * 350) * settings.speed, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
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

  function hasNote(node) {
    return Boolean(node.note?.blocks?.some(b => b.type !== 'text' || (b.text && b.text.trim())));
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

  // ---- Reminders and inbox -----------------------------------------------

  function checkReminders() {
    if (detachedId) return;
    const fired = Reminders.checkDue(root, inbox);
    if (!fired.length) return;
    save();
    fired.forEach(item => Reminders.toast(item, goToNode));
    render();
  }
  setInterval(checkReminders, 15000);
  window.addEventListener('focus', checkReminders);

  // Opens the list that holds a task or folder, so you can see it.
  function goToNode(id) {
    const ids = findPath(id);
    const node = findById(id);
    if (!ids || !node) return;
    path = node.type === 'folder' ? ids : ids.slice(0, -1);
    view = 'list';
    ui.nav = 0;
    ui.focusAdd = true;
    render();
  }

  const trayHandlers = {
    open: goToNode,
    dismiss: id => { inbox = inbox.filter(i => i.id !== id); save(); render(); },
    clear: () => { inbox = []; save(); render(); },
    markAllRead: () => { inbox.forEach(i => { i.read = true; }); save(); },
  };

  // ---- Notes -------------------------------------------------------------

  // Opens a note as its own window at (x, y). In the desktop app it's a frameless window.
  function popOutNote(id, x, y) {
    persist();
    if (desktop) {
      desktop.openNote(id, x, y);
      return;
    }
    const base = location.href.split('?')[0];
    window.open(
      `${base}?note=${encodeURIComponent(id)}`,
      `note-${id}`,
      `popup=yes,width=500,height=640,left=${Math.max(0, Math.round(x - 40))},top=${Math.max(0, Math.round(y - 16))}`,
    );
  }

  // Desktop only: the new window follows the cursor until the drag ends.
  const tearOff = desktop ? {
    start: (id, offX, offY, w, h) => { persist(); desktop.tearStart({ id, offX, offY, w, h }); },
    end: () => desktop.tearEnd(),
  } : null;

  const noteOptions = () => ({
    getNode: findById,
    onChange: save,
    motion: () => {
      const M = timing();
      return { dur: M.dur, ease: M.ease };
    },
    onPopOut: popOutNote,
    tearOff,
    detached: Boolean(detachedId),
    closeWindow: () => (desktop ? desktop.close() : window.close()),
  });

  // ---- Rendering ---------------------------------------------------------

  // Tapping "All tasks" five times quickly in 1964 mode opens the easter egg.
  let eggTaps = [];
  function tapEgg() {
    if (settings.anim !== 'retro') return;
    const t = Date.now();
    eggTaps = eggTaps.filter(x => t - x < 1500);
    eggTaps.push(t);
    if (eggTaps.length >= 5) {
      eggTaps = [];
      Pong.start();
    }
  }

  function renderCrumbs(nodes) {
    const crumbs = $('crumbs');
    crumbs.textContent = '';
    nodes.forEach((node, i) => {
      if (i > 0) crumbs.append(el('span', 'sep', '/'));
      const isLast = i === nodes.length - 1;
      const btn = el('button', isLast ? 'current' : '', i === 0 ? 'All tasks' : (node.text || 'Untitled'));
      btn.onclick = () => {
        if (i === 0) tapEgg();
        go(nodes.slice(1, i + 1).map(n => n.id), isLast ? 0 : -1);
      };
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

    const pending = (node.reminders || []).filter(r => !r.fired).length;
    const rem = el('button', `rem-btn${pending ? ' on' : ''}`, '◷');
    rem.title = pending ? `${pending} reminder${pending === 1 ? '' : 's'}` : 'Add a reminder';
    rem.onclick = e => {
      e.stopPropagation();
      Reminders.openPopover(node, rem, () => { save(); render(); });
    };
    li.append(rem);

    if (!isFolder) {
      const track = el('button', `track${node.tracked ? ' on' : ''}`, '◎');
      track.title = node.tracked ? 'Stop tracking' : 'Track day by day';
      track.onclick = () => { node.tracked = !node.tracked; save(); render(); };
      li.append(track);
    }

    const note = el('button', `note${hasNote(node) ? ' on' : ''}`, '✎');
    note.title = 'Open note';
    note.onclick = () => Notes.open(node.id, noteOptions());
    li.append(note);

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

  // Tick or untick a day from the progress grid, then redraw.
  function toggleDay(node, key) {
    if (key > todayKey) return;
    setDay(node, key, !node.log[key]);
    render();
  }

  function renderMonth(tracked) {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    const monthPrefix = `${y}-${pad(m + 1)}-`;

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
        const cell = el('td', 'cell');
        if (on) cell.classList.add('on');
        if (key === todayKey) cell.classList.add('today');
        if (key > todayKey) cell.classList.add('future');
        const btn = el('button');
        btn.title = `${label} · ${key}`;
        btn.onclick = () => toggleDay(node, key);
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

  // One row per tracked task, with a square for each day of the year, weeks running across.
  function renderYear(tracked) {
    const y = viewYear;
    const start = new Date(y, 0, 1);
    const daysInYear = Math.round((new Date(y + 1, 0, 1) - start) / 86400000);
    const lead = start.getDay();
    const columns = Math.ceil((lead + daysInYear) / 7);
    const wrap = $('yearWrap');
    wrap.textContent = '';

    for (const { node, label } of tracked) {
      const row = el('div', 'year-row');
      const name = el('div', 'year-label');
      name.append(el('span', 'label', label));
      const yearCount = Object.keys(node.log).filter(k => k.startsWith(`${y}-`)).length;
      name.append(el('span', 'meta', `${streakOf(node)}d streak · ${yearCount} this year`));

      const grid = el('div', 'year-grid');
      grid.style.gridTemplateColumns = `repeat(${columns}, var(--cell))`;
      for (let i = 0; i < columns * 7; i++) {
        const offset = i - lead;
        const cell = el('button', 'yd');
        if (offset < 0 || offset >= daysInYear) {
          cell.classList.add('blank');
          cell.disabled = true;
        } else {
          const key = keyOf(new Date(y, 0, 1 + offset));
          if (node.log[key]) cell.classList.add('on');
          if (key === todayKey) cell.classList.add('today');
          if (key > todayKey) cell.classList.add('future');
          cell.title = key;
          cell.onclick = () => toggleDay(node, key);
        }
        grid.append(cell);
      }
      row.append(name, grid);
      wrap.append(row);
    }
  }

  function renderProgress() {
    const tracked = collectTracked(root);
    $('trackEmpty').hidden = tracked.length > 0;
    const isYear = mode === 'year';
    $('periodLabel').textContent = isYear
      ? String(viewYear)
      : viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    $('modeMonth').classList.toggle('active', !isYear);
    $('modeYear').classList.toggle('active', isYear);
    $('gridWrap').hidden = isYear || tracked.length === 0;
    $('yearWrap').hidden = !isYear || tracked.length === 0;
    if (isYear) renderYear(tracked);
    else renderMonth(tracked);
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

    if (!detachedId) Reminders.renderTray(inbox, trayHandlers);

    const M = timing();
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
    setKind('task');
    ui.nav = dir;
    ui.focusAdd = true;
    render();
  }

  // ---- Composer and prompts ----------------------------------------------

  let wordTimer = null;
  const randomWord = () => WORDS[Math.floor(Math.random() * WORDS.length)];

  function setPlaceholder(text) {
    const add = $('add');
    add.placeholder = text;
    add.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 500 * settings.speed, easing: 'ease-out' });
  }

  function startWords() {
    clearInterval(wordTimer);
    if (!settings.words) {
      setPlaceholder(kind === 'folder' ? 'New folder, Enter to add' : 'New task, Enter to add');
      return;
    }
    setPlaceholder(randomWord());
    wordTimer = setInterval(() => setPlaceholder(randomWord()), 6000);
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

  function setKind(next) {
    kind = next;
    document.querySelectorAll('.kind button').forEach(b => b.classList.toggle('active', b.dataset.kind === next));
    if (!settings.words) startWords();
  }
  document.querySelectorAll('.kind button').forEach(btn => {
    btn.onclick = () => {
      setKind(btn.dataset.kind);
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
  $('modeMonth').onclick = () => { mode = 'month'; render(); };
  $('modeYear').onclick = () => { mode = 'year'; render(); };
  $('prevPeriod').onclick = () => {
    if (mode === 'year') viewYear--;
    else viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
    render();
  };
  $('nextPeriod').onclick = () => {
    if (mode === 'year') viewYear++;
    else viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    render();
  };
  $('thisPeriod').onclick = () => {
    const t = new Date();
    viewYear = t.getFullYear();
    viewMonth = new Date(t.getFullYear(), t.getMonth(), 1);
    render();
  };

  // ---- Settings ----------------------------------------------------------

  function toggleSettings(force) {
    const panel = $('settings');
    const show = force ?? panel.hidden;
    panel.hidden = !show;
    if (show) {
      applyAll();
      const M = timing();
      if (M.dur) {
        panel.animate(
          [{ opacity: 0, transform: 'translateY(-10px) scale(0.97)' }, { opacity: 1, transform: 'none' }],
          { duration: M.dur, easing: M.ease },
        );
      }
    }
  }

  $('settingsBtn').onclick = () => toggleSettings();
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleSettings(false); });
  // Clicking anywhere outside the panel closes it.
  document.addEventListener('pointerdown', e => {
    if ($('settings').hidden || e.target.closest('#settings, #settingsBtn')) return;
    toggleSettings(false);
  });

  $('theme').onchange = e => activate(e.target.value);
  $('anim').onchange = e => { settings.anim = e.target.value; touch(); };
  $('speed').oninput = e => { settings.speed = Number(e.target.value); touch(); };
  $('caret').onchange = e => { settings.caret = e.target.value; touch(); };
  $('words').onchange = e => {
    settings.words = e.target.checked;
    touch();
    startWords();
  };
  // Customisation docks where Settings is, so the two never open together.
  $('openCustomise').onclick = () => {
    toggleSettings(false);
    Customise.open();
  };

  $('exportBtn').onclick = () => {
    persist();
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' });
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
      if (!Array.isArray((data.tree || data).children)) throw new Error('Not a to-do backup');
      adopt(data);
      path = [];
      save();
      ui.focusAdd = true;
      refreshAll();
    } catch (err) {
      alert('Could not import that file: ' + err.message);
    }
    e.target.value = '';
  };

  Customise.init({
    themes,
    activeId: () => settings.themeId,
    activate,
    applyMotion,
    addCustom: theme => {
      customThemes.push(theme);
      activate(theme.id);
    },
    removeCustom: id => {
      customThemes = customThemes.filter(t => t.id !== id);
      if (settings.themeId === id) activate(DEFAULT_THEME_ID);
      else touch();
    },
    touch,
    motion: timing,
  });

  // Exposed for the customisation editor, which turns transitions off while a slider is dragged.
  window.Todo.setScale = v => applyScale(v);
  window.Todo.applyScale = () => applyScale();

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

  // ---- Start -------------------------------------------------------------

  adopt(loadInitial());
  if (!detachedId) {
    dirty = true;
    persist(); // writes the current format, including any migrated data
  }
  applyAll();
  startWords();
  render();
  if (detachedId) {
    document.documentElement.classList.add('detached');
    document.body.classList.add('detached');
    Notes.open(detachedId, noteOptions());
  } else {
    checkReminders();
  }
})();
