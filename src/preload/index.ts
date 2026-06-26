import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '@shared/types/ipc';
import type { Api } from '@shared/types/api';

const api: Api = {
  sendCommand: (skill, inputs) => ipcRenderer.invoke(IPC.sendCommand, { skill, inputs }),
  onCommandEvent: (cb) => {
    ipcRenderer.on(IPC.commandEvent, (_e, ev) => cb(ev));
  },
  getDashboard: () => ipcRenderer.invoke(IPC.getDashboard),
  readEdition: (file) => ipcRenderer.invoke(IPC.readEdition, file),
  archive: (inputs) => ipcRenderer.invoke(IPC.archiveIngest, inputs),
  getSoulStructured: () => ipcRenderer.invoke(IPC.getSoulStructured),
  saveSoulSections: (edits) => ipcRenderer.invoke(IPC.saveSoulSections, edits),
  saveSoulEchantillons: (entries) => ipcRenderer.invoke(IPC.saveSoulEchantillons, entries),
  getAgents: () => ipcRenderer.invoke(IPC.getAgents),
  saveAgent: (name, edits) => ipcRenderer.invoke(IPC.saveAgent, { name, edits }),
  copy: (text) => ipcRenderer.invoke(IPC.copy, text),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),
  hideWindow: () => ipcRenderer.invoke(IPC.hideWindow),
};

contextBridge.exposeInMainWorld('api', api);
// Alias rétro-compatible le temps que le renderer reste vanilla/migre (retiré en Phase 4).
contextBridge.exposeInMainWorld('breves', api);
