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
- **Reminders:** `◷` on a task sets a date and time. When it's due, it appears as a toast and in the **Inbox** tray at the bottom right. Reminders fire while the app is open.
- **Notes:** `✎` opens a notepad for the task. Add text, headings, to-dos, trackers, bar charts or dividers. Drag the title bar out of the app window and the note tears off into its own window, following the cursor until you let go. ⧉ pops it out without dragging. In the desktop app the note is a frameless window styled like the main one, so you can drag, dock and close it the same way. In a browser it opens as a popup, which keeps the browser's own frame.
- **Tracking:** `◎` tracks a task day by day. It gets a round "worked on it today" box and a streak. The Progress button opens a **Month** grid or a **Year** heatmap.

## Settings and customisation

**Settings** (docked on the right) has the theme dropdown, animation style and length, text cursor, random word prompts, and export/import. Clicking elsewhere closes it.

**Customise theme…** opens the editor, docked where Settings is. It edits the active theme. Built-in themes are read-only, so duplicate one to change it. Edits apply live.

- **Colours:** background, panels, text, muted text, borders, hover, accent and second accent.
- **Type:** font (the full list, each name drawn in its own font), text size, uppercase headings.
- **Shape:** corner radius, buttons (square, soft or pill), row spacing, panel opacity, glass blur.
- **Effects:** glow, shadow, grid background, scanlines.
- **Motion:** animation style, length, and text cursor. Picking a theme applies its motion and cursor too.

Built-in themes: **Default** (the Sepia look with the mono font), **Supersmooth** (pale, round, see-through panels, very slow animation), **Retro** (N64-style, chunky, uppercase, grid and scanlines) and **Terminal** (green on black).

**Animation styles:** Off, Chess (smooth), 1964 (stepped and retro), Arcade (springy, with pops and sparks). Animation length scales them all from 50% to 250%.

There's one hidden extra, and it only works in the 1964 animation style.
