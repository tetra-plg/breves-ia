import { dispatch, archiveAndIngest, type EngineDeps } from '@main/engine';
import { IPC, type IpcLike, type IpcInvokeEvent } from '@shared/types/ipc';

export function registerCommandHandlers(ipc: IpcLike, deps: EngineDeps): void {
  ipc.handle(IPC.sendCommand, async (e: IpcInvokeEvent, payload: unknown) => {
    const { skill, inputs } = (payload ?? {}) as { skill: string; inputs: Record<string, unknown> };
    const onEvent = (ev: unknown): void => {
      if (!e.sender.isDestroyed()) e.sender.send(IPC.commandEvent, ev);
    };
    try {
      return await dispatch({ skill, inputs, onEvent }, deps);
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipc.handle(IPC.archiveIngest, async (e: IpcInvokeEvent, payload: unknown) => {
    const inputs = (payload ?? {}) as {
      teamsText: string;
      topics: unknown[];
      sources: unknown[];
      leconSOUL?: string;
    };
    const onEvent = (ev: unknown): void => {
      if (!e.sender.isDestroyed()) e.sender.send(IPC.commandEvent, ev);
    };
    try {
      return await archiveAndIngest({ ...inputs, onEvent }, deps);
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });
}
