export const IPC = {
  sendCommand: 'send-command',
  commandEvent: 'command-event',
  getDashboard: 'get-dashboard',
  readEdition: 'read-edition',
  archiveIngest: 'archive-ingest',
  getSoulStructured: 'get-soul-structured',
  saveSoulSections: 'save-soul-sections',
  saveSoulEchantillons: 'save-soul-echantillons',
  getAgents: 'get-agents',
  saveAgent: 'save-agent',
  getCommands: 'get-commands',
  saveCommand: 'save-command',
  copy: 'copy',
  openExternal: 'open-external',
  hideWindow: 'hide-window',
  getSettings: 'get-settings',
  validatePath: 'validate-path',
  pickPath: 'pick-path',
  saveSettings: 'save-settings',
  quitApp: 'quit-app',
} as const;

export interface IpcInvokeEvent {
  sender: {
    send(channel: string, payload: unknown): void;
    isDestroyed(): boolean;
  };
}

export type IpcHandler = (event: IpcInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>;

export interface IpcLike {
  handle(channel: string, listener: IpcHandler): void;
}
