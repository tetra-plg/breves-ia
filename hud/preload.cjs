const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('breves', {
  sendCommand: (skill, inputs) => ipcRenderer.invoke('send-command', { skill, inputs }),
  onCommandEvent: (cb) => ipcRenderer.on('command-event', (_e, ev) => cb(ev)),
  getDashboard: () => ipcRenderer.invoke('get-dashboard'),
  readEdition: (file) => ipcRenderer.invoke('read-edition', file),
  archive: (inputs) => ipcRenderer.invoke('archive-ingest', inputs),
  getSoulStructured: () => ipcRenderer.invoke('get-soul-structured'),
  saveSoulSections: (edits) => ipcRenderer.invoke('save-soul-sections', edits),
  saveSoulEchantillons: (entries) => ipcRenderer.invoke('save-soul-echantillons', entries),
  getAgents: () => ipcRenderer.invoke('get-agents'),
  saveAgent: (name, edits) => ipcRenderer.invoke('save-agent', { name, edits }),
  copy: (text) => ipcRenderer.invoke('copy', text),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
});
