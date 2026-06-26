import { getSoul, saveSoulSections, saveSoulEchantillons, type EngineDeps } from '@main/engine';
import type { Echantillon, SoulSectionEdits } from '@domain/soul';
import { IPC, type IpcLike } from '@shared/types/ipc';

export function registerSoulHandlers(ipc: IpcLike, deps: EngineDeps): void {
  ipc.handle(IPC.getSoulStructured, () => getSoul(deps));
  ipc.handle(IPC.saveSoulSections, (_e, edits: unknown) => saveSoulSections(deps, edits as SoulSectionEdits));
  ipc.handle(IPC.saveSoulEchantillons, (_e, entries: unknown) => saveSoulEchantillons(deps, entries as Echantillon[]));
}
