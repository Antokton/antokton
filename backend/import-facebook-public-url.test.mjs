import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

const APP_ID = "6991d40eddf82cc25ec834a7";
const PORT = 4187;
const FACEBOOK_PUBLIC_POST_URL = "https://www.facebook.com/groups/253219909046543/permalink/1622278125474041/";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://localhost:${PORT}/health`);
      if (response.ok) return;
    } catch {}
    await wait(300);
  }
  throw new Error("Backend test server did not start in time");
}

test("importJobPost extracts expected fields from the exact public Facebook post URL", async () => {
  const child = spawn(process.execPath, ["backend/server.js"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "development",
      ALLOW_DEV_AUTH: "true",
      ANTOKTON_DEV_USER_EMAIL: "admin@antokton.local",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });

  try {
    await waitForServer();
    const response = await fetch(`http://localhost:${PORT}/api/apps/${APP_ID}/functions/importJobPost`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer dev:admin@antokton.local",
      },
      body: JSON.stringify({ url: FACEBOOK_PUBLIC_POST_URL, job_type: "ofroj" }),
    });
    const payload = await response.json();
    const data = payload?.data || {};
    const rawText = data.import_original_text || data.description || "";
    const parsed = {
      phone_number: data.phone_number || "",
      country: data.country || "",
      city: data.city || "",
      profession: data.profession || "",
      professions: data.professions || data.profession_list || data.drafts?.map((draft) => draft.profession).filter(Boolean) || [],
      title: data.title || "",
    };

    console.log("RAW_EXTRACTED_TEXT_START");
    console.log(rawText);
    console.log("RAW_EXTRACTED_TEXT_END");
    console.log("PARSED_FIELDS", JSON.stringify(parsed, null, 2));

    assert.equal(response.ok, true);
    assert.match(rawText, /\+49\s*177\s*8749318|\+491778749318/);
    assert.match(data.phone_number || rawText, /\+49\s*177\s*8749318|\+491778749318/);
    assert.match(`${data.country || ""} ${rawText}`, /\b(Germany|Gjermani|Deutschland)\b/i);
    assert.match(`${data.city || ""} ${rawText}`, /\bGütersloh\b/i);
    assert.match(rawText, /Glassfaser|fibra optike/i);
    assert.match(rawText, /Elektricist/i);
    assert.match(rawText, /Bagerist|Excavator|eskavator|bager/i);
    const professionsText = [parsed.profession, ...(Array.isArray(parsed.professions) ? parsed.professions : [])].join("\n");
    assert.match(professionsText, /Glassfaser Worker|Pun[eë]tor Glassfaser/i);
    assert.match(professionsText, /Electrician|Elektricist/i);
    assert.match(professionsText, /Excavator Operator|Bagerist|Operator(?:e|i)?\s+(?:ekskavator|bager)/i);
  } finally {
    child.kill("SIGTERM");
    await wait(300);
    if (!child.killed) child.kill("SIGKILL");
    if (output) console.log("BACKEND_OUTPUT", output);
  }
});
