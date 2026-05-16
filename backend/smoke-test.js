const { spawn } = require("node:child_process");

const root = require("node:path").resolve(__dirname, "..");
const appId = process.env.APP_ID || "6991d40eddf82cc25ec834a7";
const base = "http://127.0.0.1:8787";

const server = spawn(process.execPath, [require("node:path").join(__dirname, "server.js")], {
  cwd: root,
  env: { ...process.env, NODE_NO_WARNINGS: "1" },
  stdio: ["ignore", "pipe", "pipe"]
});

server.stdout.on("data", (chunk) => process.stdout.write(chunk));
server.stderr.on("data", (chunk) => process.stderr.write(chunk));

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Server did not become ready");
}

async function json(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

(async () => {
  try {
    await waitForServer();

    const health = await json(await fetch(`${base}/health`));
    console.log("health:", health.ok === true ? "ok" : "fail");

    const settings = await json(await fetch(`${base}/api/apps/public/prod/public-settings/by-id/${appId}`));
    console.log("settings:", settings.app_id === appId ? "ok" : "fail");

    const user = await json(await fetch(`${base}/api/apps/${appId}/entities/User/me`));
    console.log("user:", user.email ? "ok" : "fail");

    const created = await json(await fetch(`${base}/api/apps/${appId}/entities/Job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Smoke Test Job", status: "approved", category: "test" })
    }));
    console.log("create job:", created.id ? "ok" : "fail");

    const listed = await json(await fetch(`${base}/api/apps/${appId}/entities/Job?q=${encodeURIComponent(JSON.stringify({ status: "approved" }))}&sort=-created_date&limit=1`));
    console.log("list/filter job:", Array.isArray(listed) && listed.length >= 1 ? "ok" : "fail");

    const llm = await json(await fetch(`${base}/api/apps/${appId}/integration-endpoints/Core/InvokeLLM`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "test",
        response_json_schema: {
          type: "object",
          properties: { author_name: { type: "string" }, is_antokton: { type: "boolean" } }
        }
      })
    }));
    console.log("core InvokeLLM:", Object.prototype.hasOwnProperty.call(llm, "author_name") ? "ok" : "fail");

    const fn = await json(await fetch(`${base}/api/apps/${appId}/functions/getRecommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    }));
    console.log("function getRecommendations:", Array.isArray(fn.jobs) ? "ok" : "fail");
  } finally {
    server.kill();
  }
})().catch((error) => {
  console.error(error);
  server.kill();
  process.exit(1);
});
