import { getAgents, saveAgent, type EngineDeps, type AgentEdits } from '@main/engine';
import { IPC, type IpcLike } from '@shared/types/ipc';

export function registerAgentsHandlers(ipc: IpcLike, deps: EngineDeps): void {
  ipc.handle(IPC.getAgents, () => getAgents(deps));
  ipc.handle(IPC.saveAgent, (_e, payload: unknown) => {
    const { name, edits } = (payload ?? {}) as { name: string; edits: AgentEdits };
    return saveAgent(deps, name, edits);
  });
}
