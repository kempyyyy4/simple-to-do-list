const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 360,
    height: 620,
    minWidth: 260,
    minHeight: 220,
    frame: false,
    title: 'To-do',
    backgroundColor: '#fbfbfa',
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
