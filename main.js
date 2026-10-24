const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

// Every open window (the main list and any popped-out notes). Saved data is shared between them.
const windows = new Set();

// Saved data lives in the app's user-data folder, so it survives restarts and updates.
const dataFile = () => path.join(app.getPath('userData'), 'todo-data.json');

function readData() {
  const file = dataFile();
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    // Keep the unreadable file so nothing is lost, then start fresh.
    fs.copyFileSync(file, `${file}.broken`);
    console.error('Could not read saved data, kept a copy:', err);
    return null;
  }
}

function writeData(data) {
  const file = dataFile();
  const tmp = `${file}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file); // swap in the new file in one step, so a crash can't leave half a file
}

function createWindow({ width, height, x, y, minWidth = 260, minHeight = 220, query, frame = false }) {
  const win = new BrowserWindow({
    width,
    height,
    minWidth,
    minHeight,
    ...(x != null ? { x, y } : {}),
    frame,
    title: 'To-do',
    backgroundColor: '#f4ecd8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  windows.add(win);
  win.on('closed', () => windows.delete(win));
  win.loadFile('index.html', query ? { query } : undefined);
  return win;
}

ipcMain.on('data-load', event => {
  event.returnValue = readData();
});

ipcMain.on('data-save', (event, data) => {
  try {
    writeData(data);
  } catch (err) {
    console.error('Could not save data:', err);
  }
  // Tell the other windows, so a popped-out note and the list stay in step.
  for (const win of windows) {
    if (win.webContents !== event.sender && !win.isDestroyed()) win.webContents.send('state-update', data);
  }
  event.returnValue = true;
});

ipcMain.on('open-note-window', (_event, { id, x, y }) => {
  createWindow({
    width: 400,
    height: 520,
    minWidth: 280,
    minHeight: 240,
    x: Math.round(x - 40),
    y: Math.round(y - 16),
    query: { note: id },
  });
});

ipcMain.on('set-always-on-top', (event, value) => {
  BrowserWindow.fromWebContents(event.sender)?.setAlwaysOnTop(Boolean(value));
});

ipcMain.on('close-window', event => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

app.whenReady().then(() => createWindow({ width: 360, height: 620 }));

app.on('window-all-closed', () => {
  app.quit();
});
