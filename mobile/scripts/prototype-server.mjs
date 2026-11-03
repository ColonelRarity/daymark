#!/usr/bin/env node
/* Serves mobile/public/prototype the way the phone does: static files plus /store on port 14711.
   The /store behaviour mirrors ios/Daymark/PrototypeServer.swift (LocalStore): one JSON envelope,
   atomic replace, previous valid copy kept as store.bak, damaged main file quarantined.
   Usage: node mobile/scripts/prototype-server.mjs [--port 14711] [--dir /tmp/daymark-dev-store]
   Then open http://127.0.0.1:14711/index.html */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "public", "prototype");
const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const port = Number(flag("--port", "14711"));
const dir = path.resolve(flag("--dir", path.join(os.tmpdir(), "daymark-dev-store")));
fs.mkdirSync(dir, { recursive: true });
const mainFile = path.join(dir, "store.json");
const backupFile = path.join(dir, "store.bak");
const tempFile = path.join(dir, "store.tmp");

const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".gif": "image/gif" };

function envelope(buffer) {
  try {
    const object = JSON.parse(buffer.toString("utf8"));
    if (!object || object.format !== "daymark-store" || !object.keys || typeof object.keys !== "object") return null;
    return object;
  } catch { return null; }
}
function validData(file) {
  try { const data = fs.readFileSync(file); return envelope(data) ? data : null; } catch { return null; }
}
function readResponse() {
  let source = "empty", store = null, damaged = false;
  const mainExists = fs.existsSync(mainFile);
  const main = validData(mainFile);
  if (main) { source = "main"; store = main; }
  else {
    if (mainExists) { damaged = true; fs.renameSync(mainFile, path.join(dir, "store.damaged-" + new Date().toISOString().replace(/:/g, "-") + ".json")); }
    const backup = validData(backupFile);
    if (backup) { source = "backup"; store = backup; }
  }
  return Buffer.concat([Buffer.from(`{"ok":true,"source":"${source}","damaged":${damaged},"store":`), store || Buffer.from("null"), Buffer.from("}")]);
}
function write(buffer) {
  if (!envelope(buffer)) return false;
  fs.writeFileSync(tempFile, buffer);
  const previous = validData(mainFile);
  if (previous) {
    fs.writeFileSync(backupFile, previous);
    keepDailySnapshot(previous);
  }
  fs.renameSync(tempFile, mainFile);
  return true;
}
function keepDailySnapshot(previous) {
  const stamp = new Date().toISOString().slice(0, 10);
  const target = path.join(dir, "store.day-" + stamp + ".json");
  if (!fs.existsSync(target)) fs.writeFileSync(target, previous);
  const daily = fs.readdirSync(dir).filter(name => name.startsWith("store.day-")).sort();
  for (const name of daily.slice(0, Math.max(0, daily.length - 7))) fs.unlinkSync(path.join(dir, name));
}

http.createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (url.pathname === "/store") {
    if (request.method === "GET") { response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); return response.end(readResponse()); }
    if (request.method === "PUT" || request.method === "POST") {
      const chunks = [];
      request.on("data", chunk => chunks.push(chunk));
      request.on("end", () => {
        const ok = write(Buffer.concat(chunks));
        response.writeHead(ok ? 200 : 422, { "Content-Type": "application/json; charset=utf-8" });
        response.end(ok ? '{"ok":true}' : '{"ok":false,"reason":"invalid"}');
      });
      return;
    }
    response.writeHead(405); return response.end();
  }
  if (url.pathname === "/health/steps") { response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" }); return response.end('{"ok":false,"reason":"unavailable"}'); }
  let relative = decodeURIComponent(url.pathname);
  if (relative === "/" || relative.endsWith("/")) relative += "index.html";
  const file = path.normalize(path.join(root, relative));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { response.writeHead(404); return response.end("not found"); }
  response.writeHead(200, { "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
  fs.createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Daymark prototype at http://127.0.0.1:${port}/index.html · store in ${dir}`);
});
