const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('breves', {
  sendCommand: (skill, inputs) => ipcRenderer.invoke('send-command', { skill, inputs }),
  onCommandEvent: (cb) => ipcRenderer.on('command-event', (_e, ev) => cb(ev)),
  getDashboard: () => ipcRenderer.invoke('get-dashboard'),
  copy: (text) => ipcRenderer.invoke('copy', text),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
});
