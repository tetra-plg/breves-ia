import { getDashboard, readEdition, type EngineDeps } from '@main/engine';
import { IPC, type IpcLike } from '@shared/types/ipc';

export function registerDashboardHandlers(ipc: IpcLike, deps: EngineDeps): void {
  ipc.handle(IPC.getDashboard, () => getDashboard(deps));
  ipc.handle(IPC.readEdition, (_e, file: unknown) => readEdition(deps, String(file)));
}
