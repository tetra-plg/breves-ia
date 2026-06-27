// src/main/io/config.ts
import { readFileSync, writeFileSync, mkdirSync, statSync, accessSync, constants } from 'node:fs';
import { join, dirname } from 'node:path';

export interface UserConfig {
  bbDir?: string;
  repoDir?: string;
  claudeBin?: string;
}

const KEYS = ['bbDir', 'repoDir', 'claudeBin'] as const;

export function configPath(userDataDir: string): string {
  return join(userDataDir, 'config.json');
}

export function readUserConfig(userDataDir: string): UserConfig {
  try {
    const obj = JSON.parse(readFileSync(configPath(userDataDir), 'utf8')) as Record<string, unknown>;
    const out: UserConfig = {};
    for (const k of KEYS) if (typeof obj[k] === 'string') out[k] = obj[k] as string;
    return out;
  } catch {
    return {};
  }
}

export function writeUserConfig(userDataDir: string, cfg: UserConfig): void {
  const p = configPath(userDataDir);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf8');
}

export function pathValid(p: string, kind: 'directory' | 'file'): boolean {
  if (!p) return false;
  try {
    const st = statSync(p); // suit les symlinks (claudeBin est un symlink)
    if (kind === 'directory') return st.isDirectory();
    if (!st.isFile()) return false;
    accessSync(p, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
