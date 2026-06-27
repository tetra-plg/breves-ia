import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '@shared/types/ipc';
import type { Api } from '@shared/types/api';

const api: Api = {
  sendCommand: (skill, inputs) => ipcRenderer.invoke(IPC.sendCommand, { skill, inputs }),
  onCommandEvent: (cb) => {
    const listener = (_e: Electron.IpcRendererEvent, ev: unknown): void => cb(ev);
    ipcRenderer.on(IPC.commandEvent, listener);
    return () => {
      ipcRenderer.removeListener(IPC.commandEvent, listener);
    };
  },
  getDashboard: () => ipcRenderer.invoke(IPC.getDashboard),
  readEdition: (file) => ipcRenderer.invoke(IPC.readEdition, file),
  archive: (inputs) => ipcRenderer.invoke(IPC.archiveIngest, inputs),
  getSoulStructured: () => ipcRenderer.invoke(IPC.getSoulStructured),
  saveSoulSections: (edits) => ipcRenderer.invoke(IPC.saveSoulSections, edits),
  saveSoulEchantillons: (entries) => ipcRenderer.invoke(IPC.saveSoulEchantillons, entries),
  getAgents: () => ipcRenderer.invoke(IPC.getAgents),
  saveAgent: (name, edits) => ipcRenderer.invoke(IPC.saveAgent, { name, edits }),
  getCommands: () => ipcRenderer.invoke(IPC.getCommands),
  saveCommand: (name, edits) => ipcRenderer.invoke(IPC.saveCommand, { name, edits }),
  copy: (text) => ipcRenderer.invoke(IPC.copy, text),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),
  hideWindow: () => ipcRenderer.invoke(IPC.hideWindow),
  getSettings: () => ipcRenderer.invoke(IPC.getSettings),
  validatePath: (path, kind) => ipcRenderer.invoke(IPC.validatePath, { path, kind }),
  pickPath: (kind) => ipcRenderer.invoke(IPC.pickPath, kind),
  saveSettings: (patch) => ipcRenderer.invoke(IPC.saveSettings, patch),
  quitApp: () => ipcRenderer.invoke(IPC.quitApp),
};

contextBridge.exposeInMainWorld('api', api);
