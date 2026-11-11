import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");

test("a phrase names the meal, the plate share and the food", () => {
  const sandbox = { window: {}, console };
  vm.runInNewContext(fs.readFileSync(path.join(root, "mobile/public/prototype/mark-parse.js"), "utf8"), sandbox);
  const parsed = sandbox.window.MarkParse.parseMealUtterance("Вечеря, половина тарілки борщу і хліб");
  assert.equal(parsed.type, "dinner");
  assert.equal(parsed.intent, "log");
  assert.equal(parsed.fraction, 0.5);
  assert.ok(parsed.items.some(item => /борщ/.test(item)));
  assert.equal(sandbox.window.MarkParse.isOffTopic("яка сьогодні погода і що вдягнути"), true);
  assert.equal(sandbox.window.MarkParse.isOffTopic("погода ніяка, запиши вечерю"), false);
  assert.equal(sandbox.window.MarkParse.toneFor({ checkIn: { energy: "low" } }), "support");
  const noisy = sandbox.window.MarkParse.parseMealUtterance("Алло точка привіт це бутерброд з курячою шинкою курячою шинкою помідором та хлібом зерновим і крем сиром біло 55 відсотків");
  assert.ok(noisy.items.some(item => /бутерброд/.test(item)));
  assert.ok(noisy.items.some(item => /шинк/.test(item)));
  assert.ok(noisy.items.some(item => /помідор/.test(item)));
  assert.ok(noisy.items.some(item => /хліб/.test(item)));
  assert.ok(noisy.items.some(item => /крем/.test(item) && /сир/.test(item)));
  assert.equal(noisy.items.some(item => /алло|точка|привіт|відсотків|біло/i.test(item)), false);
});

function storeEnvelope(revision, mealName) {
  return JSON.stringify({
    format: "daymark-store",
    schema: 1,
    revision,
    keys: { "daymark-concept-v1": JSON.stringify({ logs: { "2026-11-11": { meals: [{ id: "m1", name: mealName, type: "dinner" }] } } }) }
  });
}

test("an older copy cannot replace a saved dinner", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daymark-store-"));
  const port = 18000 + Math.floor(Math.random() * 2000);
  const child = spawn(process.execPath, [path.join(root, "mobile/scripts/prototype-server.mjs"), "--port", String(port), "--dir", dir], { stdio: "ignore" });
  try {
    await new Promise(resolve => setTimeout(resolve, 200));
    const put = (body) => fetch(`http://127.0.0.1:${port}/store`, { method: "PUT", headers: { "Content-Type": "application/json" }, body });
    const first = await put(storeEnvelope(1, "Борщ"));
    assert.equal(first.status, 200);
    const stale = await put(storeEnvelope(1, "Порожньо"));
    assert.equal(stale.status, 409);
    const next = await put(storeEnvelope(2, "Борщ і хліб"));
    assert.equal(next.status, 200);
    const read = await fetch(`http://127.0.0.1:${port}/store`);
    const payload = await read.json();
    assert.equal(payload.store.revision, 2);
    assert.match(payload.store.keys["daymark-concept-v1"], /Борщ і хліб/);
  } finally {
    child.kill();
  }
});
