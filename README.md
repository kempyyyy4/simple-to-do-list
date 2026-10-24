# simple-to-do-list

A quick, nested to-do list for jotting down ideas. Tasks open into their own sub-lists, folders group things together, and each task can have a notepad and reminders.

## Run it

**In a browser:** open `index.html`. No server and no install. Data is saved in that browser's local storage.

**As a desktop window** (needs Node.js):

```bash
npm install
npm start
```

Use **Pin** in the header to keep the window on top. To make a standalone Windows app:

```bash
npx @electron/packager . "To-do" --platform=win32 --arch=x64 --out=dist
```

## Your data

- **Desktop app:** saved to `todo-data.json` in Electron's user-data folder (on Windows, usually `%APPDATA%\simple-to-do-list`). Writes go through a temp file, so a crash can't corrupt it. An unreadable file is kept as `todo-data.json.broken`.
- **Browser:** saved in local storage for that browser. Clearing site data erases it, so export first.
- **Export / Import** in Settings download and load a JSON backup, for either version.

## Using it

- **Add:** type and press Enter. Choose **Task** or **Folder** first. The cursor stays in the box, and it's focused whenever you open a list. ⟳ fills the box with a random prompt.
- **Edit:** Enter in a row adds one below it. Backspace on an empty row deletes it.
- **Sub-lists:** `›` opens a task or folder. The breadcrumb takes you back.
- **Reminders:** `◷` on a task sets a date and time. When it's due, it appears as a toast and in the **Inbox** tray at the bottom right. Open an item to jump to its task, or tick it off. Reminders fire while the app is open. A browser tab that's closed can't alert you.
- **Notes:** `✎` opens a floating notepad for the task. Add text, headings, to-dos, trackers, bar charts or dividers. Drag the title bar outside the app window to pop the note out into its own window, or use ⧉. Esc or ✕ closes it.
- **Tracking:** `◎` tracks a task day by day. It gets a round "worked on it today" box and a streak. The Progress button opens a **Month** grid or a **Year** heatmap. Click a day to tick it.

## Settings and customisation

**Settings** has the theme picker, animation style and length, text cursor, random word prompts, and export/import. Settings close when you click elsewhere.

**Customise themes…** opens the editor. Built-in themes are read-only, so duplicate one to change it. Edits apply live.

- **Colours:** background, panels, text, muted text, borders, hover, accent and second accent.
- **Type:** font (each name is shown in its own font), text size, uppercase headings.
- **Shape:** corner radius, buttons (square, soft or pill), row spacing, panel opacity, glass blur.
- **Effects:** glow, shadow, grid background, scanlines.
- **Motion:** animation style, length, and text cursor. Picking a theme applies its motion and cursor too.

Built-in themes: Light, Dark, Sepia (default), Midnight, Forest, Nord, Dracula, Solarized, Rosé, Terminal, Vaporwave, Cyberpunk. Examples to start from: **Codey** (technical, square corners, coder cursor), **Supersmooth** (slow, round, see-through panels and a glass blur) and **Retro** (N64-style, chunky, grid and scanlines).

**Animation styles:** Off, Chess (smooth), 1964 (stepped and retro), Arcade (springy, with pops and sparks). Animation length scales them all from 50% to 250%.

There's one hidden extra, and it only works in the 1964 animation style.
