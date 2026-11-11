/* Where the person's data lives.
   In the browser: localStorage, as before.
   In the app (loopback port 14711): one JSON file in the app's own storage, served by the
   native server at /store. All daymark-* keys are held in memory and written to that file
   shortly after every change; the rest of the code keeps calling localStorage as before.
   The native side writes atomically, keeps the previous valid copy and a daily snapshot.
   Nothing here ever deletes a key on its own. */
(function () {
  const PREFIX = "daymark-";
  const FORMAT = "daymark-store";
  const SCHEMA = 1;
  const STORE_URL = "/store";
  const META_KEY = "daymark-store-meta";
  const native = location.port === "14711";
  const bridge = {
    mode: "browser",
    available: false,
    source: "none",
    damaged: false,
    lastError: "",
    flushedAt: 0,
    dirty: false
  };
  window.DaymarkStore = bridge;

  const raw = {
    get: Storage.prototype.getItem,
    set: Storage.prototype.setItem,
    remove: Storage.prototype.removeItem
  };

  function isOwn(store, key) {
    return store === localStorage && typeof key === "string" && key.startsWith(PREFIX);
  }

  function webviewKeys() {
    const keys = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) keys[key] = raw.get.call(localStorage, key);
    }
    return keys;
  }

  const mem = new Map();
  let revision = 0;
  bridge.revision = 0;

  function collect() {
    if (!bridge.available) return webviewKeys();
    const keys = {};
    for (const [key, value] of mem) keys[key] = value;
    return keys;
  }

  function envelope(keys) {
    return { format: FORMAT, schema: SCHEMA, revision: revision, savedAt: new Date().toISOString(), keys: keys };
  }

  function noteRevision(store) {
    const next = Number(store && store.revision);
    if (Number.isFinite(next) && next > revision) {
      revision = next;
      bridge.revision = revision;
    }
  }

  bridge.exportAll = function () {
    return envelope(collect());
  };

  function migrate(store) {
    if (!store || typeof store !== "object" || !store.keys || typeof store.keys !== "object") return null;
    const schema = Number(store.schema) || 1;
    const keys = {};
    for (const [key, value] of Object.entries(store.keys)) {
      if (typeof key === "string" && key.startsWith(PREFIX) && typeof value === "string") keys[key] = value;
    }
    // Schema steps go here as the envelope changes. Schema 1 is a plain mirror of the keys.
    return { schema: Math.max(schema, SCHEMA), keys: keys };
  }

  function requestSync(method, body) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, STORE_URL, false);
    if (body !== undefined) xhr.setRequestHeader("Content-Type", "application/json");
    try { xhr.send(body === undefined ? null : body); } catch (error) { return null; }
    if (xhr.status < 200 || xhr.status >= 300) return null;
    try { return JSON.parse(xhr.responseText || "null"); } catch (error) { return null; }
  }

  let timer = 0;
  let inFlight = false;
  let again = false;

  function flushNow() {
    if (!bridge.available || !bridge.dirty) return Promise.resolve(true);
    if (inFlight) { again = true; return Promise.resolve(false); }
    inFlight = true;
    const sent = revision;
    const body = JSON.stringify(envelope(collect()));
    return fetch(STORE_URL, { method: "PUT", headers: { "Content-Type": "application/json" }, body: body, keepalive: body.length < 60000 })
      .then(async response => {
        if (response.status === 409) {
          bridge.lastError = "stale";
          bridge.dirty = true;
          await absorbRemote();
          return false;
        }
        if (!response.ok) throw new Error("store " + response.status);
        if (sent === revision) bridge.dirty = false;
        bridge.flushedAt = Date.now();
        bridge.lastError = "";
        return sent === revision;
      })
      .catch(error => {
        bridge.lastError = String(error && error.message || error);
        bridge.dirty = true;
        setTimeout(schedule, 4000);
        return false;
      })
      .finally(() => {
        inFlight = false;
        if (again || bridge.dirty) { again = false; schedule(); }
      });
  }

  function schedule() {
    if (!bridge.available) return;
    bridge.dirty = true;
    clearTimeout(timer);
    timer = setTimeout(flushNow, 180);
  }

  function flushBlocking() {
    if (!bridge.available || !bridge.dirty) return true;
    clearTimeout(timer);
    const sent = revision;
    const body = JSON.stringify(envelope(collect()));
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", STORE_URL, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    try { xhr.send(body); } catch (error) {
      bridge.lastError = String(error && error.message || error);
      bridge.dirty = true;
      return false;
    }
    if (xhr.status === 409) {
      bridge.lastError = "stale";
      bridge.dirty = true;
      const remote = requestSync("GET");
      if (remote && remote.store) {
        noteRevision(remote.store);
        if (typeof bridge.onStale === "function") bridge.onStale(remote.store);
      }
      return false;
    }
    if (xhr.status < 200 || xhr.status >= 300) {
      bridge.lastError = "store " + xhr.status;
      bridge.dirty = true;
      return false;
    }
    if (sent === revision) bridge.dirty = false;
    bridge.flushedAt = Date.now();
    bridge.lastError = "";
    return true;
  }

  async function absorbRemote() {
    try {
      const response = await fetch(STORE_URL, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload && payload.store) noteRevision(payload.store);
    } catch (error) {}
  }

  bridge.flush = flushNow;
  bridge.flushBlocking = flushBlocking;

  bridge.importAll = function (store) {
    const migrated = migrate(store);
    if (!migrated) return false;
    if (bridge.available) {
      mem.clear();
      for (const [key, value] of Object.entries(migrated.keys)) mem.set(key, value);
      mem.set(META_KEY, JSON.stringify({ schema: SCHEMA, restoredAt: new Date().toISOString() }));
      revision += 1;
      bridge.revision = revision;
      requestSync("PUT", JSON.stringify(envelope(collect())));
    } else {
      for (const key of Object.keys(webviewKeys())) raw.remove.call(localStorage, key);
      for (const [key, value] of Object.entries(migrated.keys)) raw.set.call(localStorage, key, value);
      raw.set.call(localStorage, META_KEY, JSON.stringify({ schema: SCHEMA, restoredAt: new Date().toISOString() }));
    }
    return true;
  };

  if (!native) {
    bridge.mode = "browser";
    return;
  }

  bridge.mode = "native";
  const response = requestSync("GET");
  if (!response || !response.ok) {
    bridge.available = false;
    bridge.lastError = "store endpoint unavailable";
    return;
  }
  bridge.available = true;
  bridge.source = response.source || "none";
  bridge.damaged = !!response.damaged;
  noteRevision(response.store);
  const migrated = migrate(response.store);
  if (migrated) {
    for (const [key, value] of Object.entries(migrated.keys)) mem.set(key, value);
    if (bridge.damaged) {
      mem.set(META_KEY, JSON.stringify({ schema: SCHEMA, recoveredFrom: bridge.source, at: new Date().toISOString() }));
      revision += 1;
      bridge.revision = revision;
      requestSync("PUT", JSON.stringify(envelope(collect())));
    }
  } else {
    // No file yet: first run of a build with the file store. Whatever the WebView still holds
    // from the previous build becomes the first copy. The WebView copy is left in place.
    const existing = webviewKeys();
    for (const [key, value] of Object.entries(existing)) mem.set(key, value);
    const had = Object.keys(existing).length;
    mem.set(META_KEY, JSON.stringify({ schema: SCHEMA, migratedFrom: had ? "webview-localstorage" : "empty", at: new Date().toISOString() }));
    revision += 1;
    bridge.revision = revision;
    requestSync("PUT", JSON.stringify(envelope(collect())));
    bridge.source = had ? "migrated" : "fresh";
  }

  Storage.prototype.getItem = function (key) {
    if (isOwn(this, key)) return mem.has(key) ? mem.get(key) : null;
    return raw.get.call(this, key);
  };
  function bump() {
    revision += 1;
    bridge.revision = revision;
    schedule();
  }
  Storage.prototype.setItem = function (key, value) {
    if (isOwn(this, key)) { mem.set(key, String(value)); bump(); return; }
    raw.set.call(this, key, value);
  };
  Storage.prototype.removeItem = function (key) {
    if (isOwn(this, key)) { mem.delete(key); bump(); return; }
    raw.remove.call(this, key);
  };

  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushBlocking(); });
  window.addEventListener("pagehide", flushBlocking);
  window.addEventListener("beforeunload", flushBlocking);
})();
