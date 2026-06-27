import { getAgents, saveAgent, type EngineDeps } from '@main/engine';
import { parseAgentSave } from '@shared/schemas/edits';
import { IPC, type IpcLike } from '@shared/types/ipc';

export function registerAgentsHandlers(ipc: IpcLike, deps: EngineDeps): void {
  ipc.handle(IPC.getAgents, () => getAgents(deps));
  ipc.handle(IPC.saveAgent, (_e, payload: unknown) => {
    const parsed = parseAgentSave(payload);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    return saveAgent(deps, parsed.value.name, parsed.value.edits);
  });
}
