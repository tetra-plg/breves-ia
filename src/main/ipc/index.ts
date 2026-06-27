import type { EngineDeps } from '@main/engine';
import type { IpcLike } from '@shared/types/ipc';
import { registerCommandHandlers } from '@main/ipc/command.handlers';
import { registerDashboardHandlers } from '@main/ipc/dashboard.handlers';
import { registerSoulHandlers } from '@main/ipc/soul.handlers';
import { registerAgentsHandlers } from '@main/ipc/agents.handlers';
import { registerCommandsHandlers } from '@main/ipc/commands.handlers';
import { registerSystemHandlers, type SystemBridge } from '@main/ipc/system.handlers';
import { registerSettingsHandlers } from '@main/ipc/settings.handlers';

export function registerAllHandlers(
  ipc: IpcLike,
  deps: EngineDeps,
  sys: SystemBridge,
  userDataDir: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  registerCommandHandlers(ipc, deps);
  registerDashboardHandlers(ipc, deps);
  registerSoulHandlers(ipc, deps);
  registerAgentsHandlers(ipc, deps);
  registerCommandsHandlers(ipc, deps);
  registerSystemHandlers(ipc, sys);
  registerSettingsHandlers(ipc, deps, sys, userDataDir, env);
}
