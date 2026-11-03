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

  function collect() {
    if (!bridge.available) return webviewKeys();
    const keys = {};
    for (const [key, value] of mem) keys[key] = value;
    return keys;
  }

  function envelope(keys) {
    return { format: FORMAT, schema: SCHEMA, savedAt: new Date().toISOString(), keys: keys };
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
    if (!bridge.available) return Promise.resolve(false);
    if (inFlight) { again = true; return Promise.resolve(false); }
    inFlight = true;
    const body = JSON.stringify(envelope(collect()));
    return fetch(STORE_URL, { method: "PUT", headers: { "Content-Type": "application/json" }, body: body, keepalive: body.length < 60000 })
      .then(response => {
        if (!response.ok) throw new Error("store " + response.status);
        bridge.dirty = false;
        bridge.flushedAt = Date.now();
        bridge.lastError = "";
        return true;
      })
      .catch(error => {
        bridge.lastError = String(error && error.message || error);
        bridge.dirty = true;
        setTimeout(schedule, 4000);
        return false;
      })
      .finally(() => {
        inFlight = false;
        if (again) { again = false; schedule(); }
      });
  }

  function schedule() {
    if (!bridge.available) return;
    bridge.dirty = true;
    clearTimeout(timer);
    timer = setTimeout(flushNow, 180);
  }

  function flushBlocking() {
    if (!bridge.available || !bridge.dirty) return;
    clearTimeout(timer);
    const body = JSON.stringify(envelope(collect()));
    let done = false;
    try {
      if (navigator.sendBeacon && body.length < 60000) done = navigator.sendBeacon(STORE_URL, new Blob([body], { type: "application/json" }));
    } catch (error) {}
    if (!done) done = !!requestSync("PUT", body);
    if (done) { bridge.dirty = false; bridge.flushedAt = Date.now(); }
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
  const migrated = migrate(response.store);
  if (migrated) {
    for (const [key, value] of Object.entries(migrated.keys)) mem.set(key, value);
    if (bridge.damaged) {
      mem.set(META_KEY, JSON.stringify({ schema: SCHEMA, recoveredFrom: bridge.source, at: new Date().toISOString() }));
      requestSync("PUT", JSON.stringify(envelope(collect())));
    }
  } else {
    // No file yet: first run of a build with the file store. Whatever the WebView still holds
    // from the previous build becomes the first copy. The WebView copy is left in place.
    const existing = webviewKeys();
    for (const [key, value] of Object.entries(existing)) mem.set(key, value);
    const had = Object.keys(existing).length;
    mem.set(META_KEY, JSON.stringify({ schema: SCHEMA, migratedFrom: had ? "webview-localstorage" : "empty", at: new Date().toISOString() }));
    requestSync("PUT", JSON.stringify(envelope(collect())));
    bridge.source = had ? "migrated" : "fresh";
  }

  Storage.prototype.getItem = function (key) {
    if (isOwn(this, key)) return mem.has(key) ? mem.get(key) : null;
    return raw.get.call(this, key);
  };
  Storage.prototype.setItem = function (key, value) {
    if (isOwn(this, key)) { mem.set(key, String(value)); schedule(); return; }
    raw.set.call(this, key, value);
  };
  Storage.prototype.removeItem = function (key) {
    if (isOwn(this, key)) { mem.delete(key); schedule(); return; }
    raw.remove.call(this, key);
  };

  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushBlocking(); });
  window.addEventListener("pagehide", flushBlocking);
  window.addEventListener("beforeunload", flushBlocking);
})();
