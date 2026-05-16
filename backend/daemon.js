const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const out = fs.openSync(path.join(__dirname, "server.out.log"), "a");
const err = fs.openSync(path.join(__dirname, "server.err.log"), "a");

const child = spawn(process.execPath, [path.join(__dirname, "server.js")], {
  cwd: root,
  detached: true,
  stdio: ["ignore", out, err],
  env: { ...process.env, NODE_NO_WARNINGS: "1" }
});

child.unref();
console.log(child.pid);
