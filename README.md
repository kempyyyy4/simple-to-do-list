# simple-to-do-list

A quick, nested to-do list for jotting down ideas. Tasks can open their own sub-lists, folders group things together, and each task can have a notepad.

## Run it

**In a browser:** open `index.html`. Everything runs locally, with no server and no install. Data is saved in that browser's local storage.

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
- **Notes:** `✎` opens a floating notepad for that task. Add text, headings, to-dos, trackers (a progress bar with − and +), bar charts (`Mon 3, Tue 5` style values), or dividers. It can be dragged and resized, and Esc closes it.
- **Tracking:** `◎` tracks a task day by day. It gets a round "worked on it today" box and a streak. The Progress button opens a **Month** grid or a **Year** heatmap of every tracked task, and you click a day to tick it. Days follow your local clock and roll over at midnight.

## Settings

- **Themes (12):** Light, Dark, Sepia (default), Midnight, Forest, Nord, Dracula, Solarized, Rosé, Terminal, Vaporwave, Cyberpunk. Switching cross-fades the colours.
- **Fonts (11):** all fonts already on your machine, so there's nothing to download.
- **Text size, density and corners.**
- **Animation:** Chess (smooth), 1964 (stepped, retro), Arcade (springy, with pops and sparks), or Off. **Animation length** scales all of them, from 50% to 200%.
- **Text cursor:** Default (the browser's), Coder (a blinking block over the next character), or Smooth (a thin bar that glides).
- **Random word prompts** on or off, and an accent colour with a reset.

Settings close when you click anywhere else.

There's one hidden extra. It only works in the 1964 animation style.
