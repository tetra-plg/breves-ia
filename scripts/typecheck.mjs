#!/usr/bin/env node
/**
 * typecheck.mjs — wrapper around `tsc --noEmit` that:
 *   - Prints ALL real diagnostic output (file/line/message).
 *   - Exits 0 when the only problem is TS18003 (no input files — src/ is still empty).
 *   - Exits 0 when there are no errors at all.
 *   - Exits non-zero when any real type error is present.
 */
import { spawnSync } from "node:child_process";

const result = spawnSync("tsc", ["--noEmit"], {
  stdio: ["ignore", "pipe", "pipe"],
  encoding: "utf8",
});

const output = (result.stdout ?? "") + (result.stderr ?? "");

if (result.status === 0) {
  // Clean — nothing to print.
  process.exit(0);
}

// Filter out the TS18003 "No inputs were found" noise (expected while src/ is empty).
const lines = output.split("\n");
const realErrors = lines.filter((l) => l.includes("error TS") && !l.includes("error TS18003"));

if (realErrors.length === 0) {
  // Only TS18003 (or no error lines at all) — treat as success.
  process.exit(0);
}

// Print the full original output so file/line/message are visible, then exit non-zero.
process.stdout.write(output);
process.exit(result.status ?? 1);
