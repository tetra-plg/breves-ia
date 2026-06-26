// Logger unique (remplace les console.* côté main). Minimal : on garde la console comme backend.
/* eslint-disable no-console */
export const logger = {
  info: (...args: unknown[]): void => console.log(...args),
  warn: (...args: unknown[]): void => console.warn(...args),
  error: (...args: unknown[]): void => console.error(...args),
};
