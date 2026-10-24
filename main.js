const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let win;

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

ipcMain.on('data-load', event => {
  event.returnValue = readData();
});

ipcMain.on('data-save', (event, data) => {
  try {
    writeData(data);
  } catch (err) {
    console.error('Could not save data:', err);
  }
  event.returnValue = true;
});

function createWindow() {
  win = new BrowserWindow({
    width: 360,
    height: 620,
    minWidth: 260,
    minHeight: 220,
    frame: false,
    title: 'To-do',
    backgroundColor: '#f4ecd8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');
}

ipcMain.on('set-always-on-top', (_event, value) => {
  win?.setAlwaysOnTop(Boolean(value));
});

ipcMain.on('close-window', () => {
  win?.close();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});
