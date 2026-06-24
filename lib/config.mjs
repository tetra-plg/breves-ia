export function loadEngineConfig(env = process.env) {
  return { bbDir: env.BREVES_BB_DIR || '/Users/pleguern/Workspace/BoilingBrain' };
}
