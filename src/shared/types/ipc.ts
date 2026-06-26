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
  copy: 'copy',
  openExternal: 'open-external',
  hideWindow: 'hide-window',
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
