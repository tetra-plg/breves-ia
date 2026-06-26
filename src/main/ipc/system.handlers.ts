import { IPC, type IpcLike } from '@shared/types/ipc';

export interface SystemBridge {
  writeClipboard(text: string): void;
  openExternal(url: string): void;
  hideWindow(): void;
}

export function registerSystemHandlers(ipc: IpcLike, sys: SystemBridge): void {
  ipc.handle(IPC.copy, (_e, text: unknown) => {
    sys.writeClipboard(String(text));
    return true;
  });
  ipc.handle(IPC.openExternal, (_e, url: unknown) => {
    if (/^https?:\/\//.test(String(url))) sys.openExternal(String(url));
  });
  ipc.handle(IPC.hideWindow, () => {
    sys.hideWindow();
  });
}
