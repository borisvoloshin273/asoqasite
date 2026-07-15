/* ASOQA site server — zero external deps.
   Serves the static site AND accepts POST /api/lead, forwarding each lead to
   Telegram (sendMessage) for every configured chat_id.

   Config (secrets NEVER committed) — read from, in order of precedence:
     1. env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_IDS (comma-separated), PORT
     2. server/config.json  (gitignored)
*/
"use strict";
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");            // site root (index.html lives here)
const CFG_FILE = path.join(__dirname, "config.json");

function loadConfig() {
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(CFG_FILE, "utf8")); } catch (e) {}
  const token = process.env.TELEGRAM_BOT_TOKEN || cfg.token || "";
  let ids = process.env.TELEGRAM_CHAT_IDS || cfg.chatIds || [];
  if (typeof ids === "string") ids = ids.split(",").map(s => s.trim()).filter(Boolean);
  const port = parseInt(process.env.PORT || cfg.port || "8080", 10);
  return { token, chatIds: ids, port };
}
const CONFIG = loadConfig();
if (!CONFIG.token || !CONFIG.chatIds.length) {
  console.warn("[warn] Telegram token/chatIds not configured — /api/lead will 500 until set.");
}

/* ---------- static file serving ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".mp4": "video/mp4", ".webm": "video/webm", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};
function safePath(urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0]);
  if (p === "/" || p === "") p = "/index.html";
  const full = path.normalize(path.join(ROOT, p));
  if (!full.startsWith(ROOT)) return null;              // block traversal
  return full;
}
function serveStatic(req, res) {
  const full = safePath(req.url);
  if (!full) { res.writeHead(403).end("forbidden"); return; }
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { "Content-Type": "text/plain" }).end("not found"); return; }
    const ext = path.extname(full).toLowerCase();
    const headers = { "Content-Type": MIME[ext] || "application/octet-stream", "X-Content-Type-Options": "nosniff" };
    if (ext === ".html") headers["Cache-Control"] = "no-cache";
    else if (/\.(webp|jpe?g|png|svg|mp4|webm|woff2|css|js)$/.test(ext)) headers["Cache-Control"] = "public, max-age=2592000";
    res.writeHead(200, headers);
    fs.createReadStream(full).pipe(res);
  });
}

/* ---------- lead handling ---------- */
const hits = new Map();                                 // ip -> [timestamps]  (basic rate limit)
function rateLimited(ip) {
  const now = Date.now(), win = 60000, max = 5;
  const arr = (hits.get(ip) || []).filter(t => now - t < win);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TG_HANDLE = /^@?[A-Za-z0-9_]{3,32}$/;

function tg(method, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: "api.telegram.org", path: `/bot${CONFIG.token}/${method}`, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }, timeout: 12000,
    }, r => { let b = ""; r.on("data", c => b += c); r.on("end", () => resolve({ status: r.statusCode, body: b })); });
    req.on("error", reject); req.on("timeout", () => req.destroy(new Error("timeout")));
    req.write(data); req.end();
  });
}

function handleLead(req, res) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "?";
  let body = "";
  req.on("data", c => { body += c; if (body.length > 8192) req.destroy(); });
  req.on("end", async () => {
    let d = {};
    try { d = JSON.parse(body || "{}"); } catch (e) {}
    const app = (d.app || "").toString().trim().slice(0, 200);
    const method = d.method === "telegram" ? "telegram" : "email";
    const contact = (d.contact || d.email || "").toString().trim().slice(0, 200);
    const langv = d.lang === "es" ? "ES" : "EN";
    const hp = (d.website || "").toString().trim();
    const elapsed = Number(d.elapsed) || 0;

    // spam traps: honeypot filled or submitted implausibly fast → accept silently, don't forward
    if (hp || elapsed < 700) { res.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true}'); return; }
    const contactOk = method === "telegram" ? TG_HANDLE.test(contact) : EMAIL.test(contact);
    if (!app || !contactOk) { res.writeHead(400, { "Content-Type": "application/json" }).end('{"ok":false,"error":"invalid"}'); return; }
    if (rateLimited(ip)) { res.writeHead(429, { "Content-Type": "application/json" }).end('{"ok":false,"error":"rate"}'); return; }
    if (!CONFIG.token || !CONFIG.chatIds.length) { res.writeHead(500, { "Content-Type": "application/json" }).end('{"ok":false,"error":"unconfigured"}'); return; }

    const contactLine = method === "telegram"
      ? "✈️ <b>Telegram:</b> " + esc(contact.replace(/^@?/, "@")) + "\n"
      : "✉️ <b>Email:</b> " + esc(contact) + "\n";
    const when = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
    const text =
      "🚀 <b>New lead — ASOQA</b>\n\n" +
      "📱 <b>App:</b> " + esc(app) + "\n" +
      contactLine +
      "🌐 <b>Lang:</b> " + langv + "\n" +
      "🕒 " + when + "\n" +
      "🔗 asoqa.io";

    const results = await Promise.allSettled(
      CONFIG.chatIds.map(id => tg("sendMessage", { chat_id: id, text, parse_mode: "HTML", disable_web_page_preview: true }))
    );
    const ok = results.some(r => r.status === "fulfilled" && r.value.status === 200);
    if (ok) res.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true}');
    else { console.error("[lead] telegram send failed", results.map(r => r.status === "fulfilled" ? r.value.body : String(r.reason))); res.writeHead(502, { "Content-Type": "application/json" }).end('{"ok":false,"error":"upstream"}'); }
  });
}

/* ---------- router ---------- */
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/lead") return handleLead(req, res);
  if (req.method === "GET" && req.url === "/api/health") { res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: true, configured: !!(CONFIG.token && CONFIG.chatIds.length), recipients: CONFIG.chatIds.length })); return; }
  if (req.method === "GET" || req.method === "HEAD") return serveStatic(req, res);
  res.writeHead(405, { "Content-Type": "text/plain" }).end("method not allowed");
});
server.listen(CONFIG.port, () => console.log(`ASOQA server on :${CONFIG.port}  (recipients: ${CONFIG.chatIds.length})`));
