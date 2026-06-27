import { getCommands, saveCommand, type EngineDeps, type CommandEdits } from '@main/engine';
import { IPC, type IpcLike } from '@shared/types/ipc';

export function registerCommandsHandlers(ipc: IpcLike, deps: EngineDeps): void {
  ipc.handle(IPC.getCommands, () => getCommands(deps));
  ipc.handle(IPC.saveCommand, (_e, payload: unknown) => {
    const { name, edits } = (payload ?? {}) as { name: string; edits: CommandEdits };
    return saveCommand(deps, name, edits);
  });
}
