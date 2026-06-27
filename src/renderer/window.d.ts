import type { Api } from '@shared/types/api';

declare global {
  interface Window {
    api: Api;
  }
}

export {};
