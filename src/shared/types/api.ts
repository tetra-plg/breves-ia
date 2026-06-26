// Forme exacte exposée par le preload sous window.api (et l'alias window.breves).
export interface Api {
  sendCommand(skill: string, inputs: unknown): Promise<unknown>;
  onCommandEvent(cb: (ev: unknown) => void): void;
  getDashboard(): Promise<unknown>;
  readEdition(file: string): Promise<unknown>;
  archive(inputs: unknown): Promise<unknown>;
  getSoulStructured(): Promise<unknown>;
  saveSoulSections(edits: unknown): Promise<unknown>;
  saveSoulEchantillons(entries: unknown): Promise<unknown>;
  getAgents(): Promise<unknown>;
  saveAgent(name: string, edits: unknown): Promise<unknown>;
  copy(text: string): Promise<unknown>;
  openExternal(url: string): Promise<unknown>;
  hideWindow(): Promise<unknown>;
}
