import { getCommands, saveCommand, type EngineDeps } from '@main/engine';
import { parseCommandSave } from '@shared/schemas/edits';
import { IPC, type IpcLike } from '@shared/types/ipc';

export function registerCommandsHandlers(ipc: IpcLike, deps: EngineDeps): void {
  ipc.handle(IPC.getCommands, () => getCommands(deps));
  ipc.handle(IPC.saveCommand, (_e, payload: unknown) => {
    const parsed = parseCommandSave(payload);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    return saveCommand(deps, parsed.value.name, { description: parsed.value.edits.description ?? '', body: parsed.value.edits.body });
  });
}
