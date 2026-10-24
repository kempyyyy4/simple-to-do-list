# simple-to-do-list

A quick, nested to-do list for jotting down ideas. Tasks can open their own sub-lists, and folders group things together.

## Use it in a browser

Open `index.html`. Everything is saved in the browser's local storage.

## Use it as a desktop window

Requires Node.js.

```bash
npm install
npm start
```

This opens a small frameless window. Use **Pin** in the header to keep it above other windows. To put it on your desktop, drag it to the edge of your screen, or package it with `@electron/packager` (see below).

To make a standalone Windows app:

```bash
npx @electron/packager . "To-do" --platform=win32 --arch=x64 --out=dist
```

## Your data

- **Desktop app:** saved to `todo-data.json` in Electron's user-data folder. On Windows that's usually `%APPDATA%\simple-to-do-list`. Writes go to a temp file first, so a crash can't corrupt your list. If the file can't be read, it's kept as `todo-data.json.broken`.
- **Browser:** saved in local storage for that browser. Clearing site data erases it, so export a backup first.
- **Export / Import** in Settings download and load a JSON backup, which works for either version.

## How it works

- **Add:** type in the box and press Enter. Pick **Task** or **Folder** first. The cursor stays in the box, and it's focused again whenever you open a list.
- **Edit:** Enter in a row adds one below it. Backspace on an empty row deletes it.
- **Sub-lists:** click the `›` on a task or folder to open it. Use the breadcrumb at the top to go back.
- **Track a task:** click ◎ to track it. Tracked tasks get a round "worked on this today" box and a streak count. Tick it once you've done some work that day.
- **Progress:** the Progress button opens a month grid of every tracked task. Click a day to tick or untick it. Future days are locked. The grid follows your local clock and rolls over at midnight.
- **Themes:** Light, Dark, Sepia, Midnight, Forest and Cyberpunk. Each has its own default accent, and you can override it.
- **Animation:**
  - *Chess* is a smooth, quiet ease.
  - *1964* uses stepped, retro motion.
  - *Arcade* bounces, pops checkboxes and throws sparks when a task is finished.
  - *Off* turns animation off.
