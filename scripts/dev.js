#!/usr/bin/env node
// scripts/dev.js — runs frontend and backend dev servers without "concurrently"
const { spawn } = require("child_process");

const colors = { frontend: "\x1b[36m", backend: "\x1b[33m", reset: "\x1b[0m" };

function spawnProcess(label, color, cmd, args, cwd) {
  const proc = spawn(cmd, args, { cwd, stdio: "pipe", shell: true });
  proc.stdout.on("data", (d) =>
    process.stdout.write(`${color}[${label}]${colors.reset} ${d}`)
  );
  proc.stderr.on("data", (d) =>
    process.stderr.write(`${color}[${label}]${colors.reset} ${d}`)
  );
  proc.on("exit", (code) => {
    if (code !== 0 && code !== null)
      console.log(`${color}[${label}]${colors.reset} exited with code ${code}`);
  });
  return proc;
}

const root = process.cwd();
const fe = spawnProcess("frontend", colors.frontend, "npm", ["run", "dev", "-w", "frontend"], root);
const be = spawnProcess("backend",  colors.backend,  "npm", ["run", "dev", "-w", "backend"],  root);

function cleanup() { fe.kill(); be.kill(); process.exit(); }
process.on("SIGINT",  cleanup);
process.on("SIGTERM", cleanup);
