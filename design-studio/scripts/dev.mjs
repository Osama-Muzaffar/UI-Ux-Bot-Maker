// Starts the API server (tsx watch) and the Vite dev server together.
// Binaries are launched via `node <path>` because this project's folder name contains ":",
// which breaks PATH lookups for node_modules/.bin.
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const run = (name, args) => {
  const child = spawn(process.execPath, args, { cwd: root, stdio: "inherit", env: { ...process.env, NODE_NO_WARNINGS: "1" } });
  child.on("exit", (code) => {
    console.log(`[${name}] exited with ${code}`);
    process.exit(code ?? 0);
  });
  return child;
};

const children = [
  run("api", [join(root, "node_modules/tsx/dist/cli.mjs"), "watch", "--clear-screen=false", "server/index.ts"]),
  run("web", [join(root, "node_modules/vite/bin/vite.js")]),
];
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => children.forEach((c) => c.kill(sig)));
