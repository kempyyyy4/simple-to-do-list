const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  setAlwaysOnTop: value => ipcRenderer.send('set-always-on-top', value),
  close: () => ipcRenderer.send('close-window'),
});
