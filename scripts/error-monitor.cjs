#!/usr/bin/env node
/**
 * mybingocard.com Error Monitor
 * Runs every 30 min via PM2 cron. Posts to Discord if real errors found.
 */

const { execSync } = require("child_process");
const EXEC_OPTS = { encoding: "utf8", timeout: 15000, shell: "/bin/bash" };
const https = require("https");
const fs = require("fs");

const CHANNEL_ID = "1476666529184616510";
const TOKEN_FILE = "/tmp/.dtoken";
const KNOWN_BENIGN_CHUNKS = ["4869cf5e8d29861b.css"]; // stale build chunk, harmless

function getToken() {
  try { return fs.readFileSync(TOKEN_FILE, "utf8").trim(); } catch { return null; }
}

function discordPost(content) {
  const token = getToken();
  if (!token) { console.log("No token, skipping Discord notify"); return; }
  const body = JSON.stringify({ content });
  const opts = {
    hostname: "discord.com",
    path: `/api/v10/channels/${CHANNEL_ID}/messages`,
    method: "POST",
    headers: {
      "Authorization": `Bot ${token}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  };
  const req = https.request(opts, (res) => {
    console.log("Discord response:", res.statusCode);
  });
  req.on("error", (e) => console.error("Discord error:", e.message));
  req.write(body);
  req.end();
}

function checkNginx() {
  try {
    const out = execSync("python3 /var/www/mybingocard.com/scripts/nginx-check.py",
      { encoding: "utf8", timeout: 15000, shell: "/bin/bash" }
    );
    const lines = out.trim().split("\n").filter(Boolean);
    const real = lines.filter(l => !KNOWN_BENIGN_CHUNKS.some(c => l.includes(c)));
    return real;
  } catch (e) {
    return [];
  }
}

function checkPM2Errors() {
  try {
    // Read the raw PM2 error log file — filter by timestamp (last 35 min)
    const cutoffMs = Date.now() - 35 * 60 * 1000;
    const logFile = "/root/.pm2/logs/mybingocard-error.log";
    if (!logFile) return [];
    const raw = require("fs").existsSync(logFile) ? require("fs").readFileSync(logFile, "utf8") : "";
    const lines = raw.split("\n").filter(l => {
      if (!l.includes("Event handlers") && !l.includes("FATAL") && !l.includes("⨯ Error:")) return false;
      // PM2 log lines have timestamps like "2026-03-13T19:21:00: "
      const m = l.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
      if (!m) return false;
      return new Date(m[1] + "Z").getTime() > cutoffMs;
    });
    const unique = [...new Set(lines.map(l => l.replace(/.*\|/, "").replace(/^\d{4}-.*?:\s*/, "").trim()))];
    return unique.slice(0, 5);
  } catch { return []; }
}

function checkMongo() {
  try {
    const out = execSync(
      `mongosh mongodb://localhost:27017/mybingocard --quiet --eval "
        const since = new Date(Date.now()-1800000);
        const errs = db.activity_events.find({createdAt:{\\$gte:since},event:{\\$in:['api_error','card_save_error','auth_error']}}).limit(10).toArray();
        print(JSON.stringify(errs.length));
      "`,
      { encoding: "utf8", timeout: 15000, shell: "/bin/bash" }
    );
    const count = parseInt(out.trim()) || 0;
    return count;
  } catch { return 0; }
}

// Run checks
const nginx5xx = checkNginx();
const pm2Errors = checkPM2Errors();
const mongoErrors = checkMongo();

const issues = [];

if (nginx5xx.length > 0) {
  issues.push(`🔴 **Nginx 5xx errors:**\n\`\`\`\n${nginx5xx.slice(0,10).join("\n")}\n\`\`\``);
}

// Only alert on auth errors if >5 (small number = bot attempts, normal)
const credErrors = pm2Errors.filter(l => l.includes("CredentialsSignin")).length;
const otherErrors = pm2Errors.filter(l => !l.includes("CredentialsSignin"));
if (otherErrors.length > 0) {
  issues.push(`🔴 **PM2 errors:**\n\`\`\`\n${otherErrors.slice(0,3).join("\n")}\n\`\`\``);
}
if (credErrors > 10) {
  issues.push(`⚠️ **High login failure count:** ${credErrors} CredentialsSignin errors (possible brute force)`);
}

if (mongoErrors > 0) {
  issues.push(`⚠️ **App errors in DB:** ${mongoErrors} error events in last 30 min`);
}

if (issues.length > 0) {
  const msg = `⚠️ **mybingocard.com — Error Monitor Alert** (${new Date().toLocaleTimeString("en-US", {timeZone:"America/Phoenix"})} MST)\n\n${issues.join("\n\n")}`;
  console.log("Alerting Discord:", msg);
  discordPost(msg);
} else {
  console.log("All clear —", new Date().toISOString());
}
