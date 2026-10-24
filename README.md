# simple-to-do-list

A quick, nested to-do list for jotting down ideas. Each task can open its own list, Notion-style.

## Use it in a browser

Open `index.html`. Everything is saved in the browser's local storage.

## Use it as a desktop window

Requires Node.js.

```bash
npm install
npm start
```

This opens a small frameless window. Use **Pin** in the header to keep it above other windows. To put it on your desktop, drag it to the edge of your screen, or package it with a tool such as `electron-packager` or `electron-builder`.

## How it works

- Type in the top box and press Enter to add a task.
- Press Enter in a task to add another one below it. Backspace on an empty task deletes it.
- Click the `›` on a task to open its sub-list. Use the breadcrumb at the top to go back.
- Settings (theme, font, accent colour) are saved per browser.
- **Export** downloads your whole list as JSON. **Import** loads a backup. Storage is per browser, so export before clearing site data.
