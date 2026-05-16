const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const APP_ID = process.env.APP_ID || "6991d40eddf82cc25ec834a7";
const LIVE_ORIGIN = (process.env.LIVE_ORIGIN || "https://antokton.com").replace(/\/+$/, "");
const PORT = Number(process.env.LIVE_IMPORT_PORT || 8790);
const LAST_OUTPUT_PATH = path.join(__dirname, "live-import-last-output.txt");

function send(res, status, body, headers = {}) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": typeof body === "string" ? "text/html; charset=utf-8" : "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Private-Network": "true",
    ...headers
  });
  res.end(text);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function page(message = "") {
  return `<!doctype html>
<html lang="sq">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Antokton Live Import</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, system-ui, Segoe UI, sans-serif; background: #0b1020; color: #fff; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #0b1020; }
      main { width: min(100%, 480px); }
      h1 { margin: 0 0 8px; font-size: 28px; }
      p { color: rgba(255,255,255,.68); line-height: 1.5; }
      form { display: grid; gap: 14px; margin-top: 22px; }
      label { display: grid; gap: 7px; font-size: 13px; color: rgba(255,255,255,.76); }
      input { height: 46px; border-radius: 10px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06); color: #fff; padding: 0 13px; font-size: 15px; }
      button { height: 46px; border: 0; border-radius: 10px; background: linear-gradient(90deg,#8ab4ff,#9bffd6); color: #0b1020; font-weight: 800; cursor: pointer; }
      button:disabled { opacity: .6; cursor: wait; }
      pre { margin-top: 18px; white-space: pre-wrap; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: 12px; max-height: 360px; overflow: auto; }
      .hint { font-size: 13px; color: rgba(255,255,255,.52); }
    </style>
  </head>
  <body>
    <main>
      <h1>Antokton Live Import</h1>
      <p>Fut kredencialet ketu lokalisht. Fjalekalimi perdoret vetem per te marre token-in nga antokton.com dhe nuk ruhet ne disk.</p>
      <form id="form">
        <label>Email
          <input name="email" type="email" autocomplete="username" required />
        </label>
        <label>Password
          <input name="password" type="password" autocomplete="current-password" required />
        </label>
        <label>Limit per entitet
          <input name="limit" type="number" min="1" max="20000" value="5000" />
        </label>
        <button id="submit" type="submit">Login dhe importo</button>
      </form>
      <p class="hint">Pas importit, hap projektin lokal te http://127.0.0.1:8787/Home.</p>
      ${message ? `<pre>${escapeHtml(message)}</pre>` : `<pre id="output" hidden></pre>`}
    </main>
    <script>
      const form = document.getElementById("form");
      const button = document.getElementById("submit");
      const output = document.getElementById("output");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        button.disabled = true;
        button.textContent = "Duke importuar...";
        output.hidden = false;
        output.textContent = "Po behet login dhe import nga live...\\n";
        const data = Object.fromEntries(new FormData(form).entries());
        try {
          const response = await fetch("/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
          });
          const text = await response.text();
          output.textContent = text;
        } catch (error) {
          output.textContent = "Gabim: " + error.message;
        } finally {
          button.disabled = false;
          button.textContent = "Login dhe importo";
          form.password.value = "";
        }
      });
    </script>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function login(email, password) {
  const response = await fetch(`${LIVE_ORIGIN}/api/apps/${APP_ID}/auth/login`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Antokton local live importer"
    },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(30000)
  });
  const text = await response.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { message: text };
  }
  if (!response.ok || !json.access_token) {
    throw new Error(json.message || json.detail || `Login failed (${response.status})`);
  }
  return json.access_token;
}

function runImport(token, limit) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["backend/import-live-data.js", `--limit=${limit || 5000}`], {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        LIVE_AUTHORIZATION: `Bearer ${token}`
      },
      windowsHide: true
    });

    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(output || `Importer exited with code ${code}`));
    });
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      return send(res, 204, "", { "Content-Type": "text/plain; charset=utf-8" });
    }

    if (req.method === "GET" && req.url === "/") {
      return send(res, 200, page());
    }

    if (req.method === "POST" && req.url === "/import") {
      const body = await readJson(req);
      if (!body.email || !body.password) return send(res, 400, "Mungon email ose password.");
      const limit = Math.min(Math.max(Number(body.limit || 5000), 1), 20000);
      const token = await login(body.email, body.password);
      const output = await runImport(token, limit);
      fs.writeFileSync(LAST_OUTPUT_PATH, output);
      return send(res, 200, `Importi perfundoi.\\n\\n${output}`, { "Content-Type": "text/plain; charset=utf-8" });
    }

    if (req.method === "POST" && req.url === "/import-token") {
      const body = await readJson(req);
      const token = String(body.token || "").trim();
      if (!token) return send(res, 400, "Token-i nuk u gjet ne sesionin e hapur.");
      const limit = Math.min(Math.max(Number(body.limit || 5000), 1), 20000);
      const output = await runImport(token, limit);
      fs.writeFileSync(LAST_OUTPUT_PATH, output);
      return send(res, 200, `Importi nga sesioni i hapur perfundoi.\\n\\n${output}`, { "Content-Type": "text/plain; charset=utf-8" });
    }

    return send(res, 404, "Not found");
  } catch (error) {
    return send(res, 500, `Gabim: ${error.message}`, { "Content-Type": "text/plain; charset=utf-8" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Antokton live import login running on http://127.0.0.1:${PORT}`);
});
