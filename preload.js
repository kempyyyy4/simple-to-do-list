const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  setAlwaysOnTop: value => ipcRenderer.send('set-always-on-top', value),
  close: () => ipcRenderer.send('close-window'),
  loadData: () => ipcRenderer.sendSync('data-load'),
  saveData: data => ipcRenderer.send('data-save', data),
  saveDataSync: data => ipcRenderer.sendSync('data-save', data),
});
