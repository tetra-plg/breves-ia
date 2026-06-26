import type { EngineDeps } from '@main/engine';
import type { IpcLike } from '@shared/types/ipc';
import { registerCommandHandlers } from '@main/ipc/command.handlers';
import { registerDashboardHandlers } from '@main/ipc/dashboard.handlers';
import { registerSoulHandlers } from '@main/ipc/soul.handlers';
import { registerAgentsHandlers } from '@main/ipc/agents.handlers';
import { registerSystemHandlers, type SystemBridge } from '@main/ipc/system.handlers';

export function registerAllHandlers(ipc: IpcLike, deps: EngineDeps, sys: SystemBridge): void {
  registerCommandHandlers(ipc, deps);
  registerDashboardHandlers(ipc, deps);
  registerSoulHandlers(ipc, deps);
  registerAgentsHandlers(ipc, deps);
  registerSystemHandlers(ipc, sys);
}
