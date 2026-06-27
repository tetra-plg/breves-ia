import { IPC, type IpcLike } from '@shared/types/ipc';
import type { EngineDeps } from '@main/engine';
import { applyConfig } from '@main/engine';
import type { SystemBridge } from '@main/ipc/system.handlers';
import { readUserConfig, writeUserConfig, pathValid, type UserConfig } from '@main/io/config';
import { resolveSetting } from '@main/io/env';
import type { SettingKey, SettingsState } from '@shared/types/api';

const KINDS: Record<SettingKey, 'directory' | 'file'> = {
  bbDir: 'directory',
  repoDir: 'directory',
  claudeBin: 'file',
};

export function buildSettingsState(env: NodeJS.ProcessEnv, userConfig: UserConfig): SettingsState {
  const mk = (key: SettingKey): SettingsState[SettingKey] => {
    const { value, source } = resolveSetting(key, env, userConfig);
    return { value, source, valid: pathValid(value, KINDS[key]) };
  };
  return { bbDir: mk('bbDir'), repoDir: mk('repoDir'), claudeBin: mk('claudeBin') };
}

export function registerSettingsHandlers(
  ipc: IpcLike,
  deps: EngineDeps,
  sys: SystemBridge,
  userDataDir: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  ipc.handle(IPC.getSettings, () => buildSettingsState(env, readUserConfig(userDataDir)));

  ipc.handle(IPC.validatePath, (_e, payload: unknown) => {
    const { path, kind } = (payload ?? {}) as { path?: string; kind?: 'directory' | 'file' };
    return pathValid(path ?? '', kind === 'file' ? 'file' : 'directory');
  });

  ipc.handle(IPC.pickPath, (_e, kind: unknown) => sys.pickPath(kind === 'file' ? 'file' : 'directory'));

  ipc.handle(IPC.saveSettings, (_e, payload: unknown) => {
    const patch = (payload ?? {}) as UserConfig;
    for (const key of Object.keys(patch) as SettingKey[]) {
      const v = patch[key];
      if (v != null && !pathValid(v, KINDS[key])) {
        return { ok: false, error: `Chemin invalide pour ${key} : ${v}` };
      }
    }
    try {
      writeUserConfig(userDataDir, { ...readUserConfig(userDataDir), ...patch });
      applyConfig(deps, patch, env);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  });

  ipc.handle(IPC.quitApp, () => {
    sys.quit();
  });
}
