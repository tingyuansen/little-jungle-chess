import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync, existsSync } from "node:fs";
const manifest = JSON.parse(
  readFileSync(new URL("../dist/manifest.webmanifest", import.meta.url)),
);
test("install manifest has fullscreen mode, same-scope launch, and correctly sized PNGs", () => {
  assert.equal(manifest.display, "fullscreen");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.start_url, "./");
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((i) => i.sizes === `${size}x${size}`);
    assert(icon);
    const bytes = readFileSync(new URL("../dist/" + icon.src, import.meta.url));
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }
});
function worker() {
  const source = readFileSync(new URL("../dist/sw.js", import.meta.url), "utf8"),
    currentCache = source.match(/"little-jungle-shell-[^"]+"/)[0],
    staleCache = "little-jungle-shell-v0";
  if (staleCache === currentCache) throw Error("bump the shell cache version");
  const listeners = {},
    entries = new Map(),
    deleted = [],
    network = [];
  let claimed = false;
  const cache = {
    addAll: async (reqs) => {
      for (const r of reqs) {
        const path = new URL(r.url).pathname.replace("/game/", "");
        assert(
          existsSync(
            new URL("../dist/" + (path || "index.html"), import.meta.url),
          ),
          path + " exists",
        );
        entries.set(r.url, "cached:" + path);
      }
    },
    match: async (key) => entries.get(typeof key === "string" ? key : key.url),
  };
  const sandbox = {
    URL,
    Request,
    caches: {
      open: async () => cache,
      keys: async () => [
        staleCache,
        "other-app-cache",
        currentCache,
      ],
      delete: async (key) => deleted.push(key),
    },
    fetch: async (req) => {
      network.push(req.url);
      throw Error("offline");
    },
    self: {
      location: { href: "https://example.test/game/sw.js" },
      clients: {
        claim: async () => {
          claimed = true;
        },
      },
      addEventListener: (name, cb) => (listeners[name] = cb),
    },
  };
  vm.runInNewContext(
    readFileSync(new URL("../dist/sw.js", import.meta.url), "utf8"),
    sandbox,
  );
  return {
    listeners,
    entries,
    deleted,
    network,
    get claimed() {
      return claimed;
    },
  };
}
test("offline shell caches every local dependency and works at a subpath", async () => {
  const w = worker();
  let pending;
  w.listeners.install({ waitUntil: (p) => (pending = p) });
  await pending;
  for (const path of [
    "",
    "app.mjs",
    "pwa.mjs",
    "assets/animals.png",
    "fonts/nunito.ttf",
  ]) {
    let response;
    w.listeners.fetch({
      request: {
        method: "GET",
        url: "https://example.test/game/" + path,
        mode: path ? "cors" : "navigate",
      },
      respondWith: (p) => (response = p),
    });
    assert.match(await response, /^cached:/);
  }
  assert.equal(w.network.length, 0);
  let intercepted = false;
  w.listeners.fetch({
    request: {
      method: "GET",
      url: "https://example.test/account",
      mode: "navigate",
    },
    respondWith: () => (intercepted = true),
  });
  assert.equal(intercepted, false);
  w.listeners.activate({ waitUntil: (p) => (pending = p) });
  await pending;
  assert.deepEqual(w.deleted, ["little-jungle-shell-v0"]);
  assert(w.claimed);
});
function installHarness() {
  class Element {
    constructor() {
      this.handlers = {};
      this.open = false;
      this.hidden = false;
      this.textContent = "";
      this.classList = { contains: () => false, toggle: () => {} };
    }
    addEventListener(name, fn) {
      this.handlers[name] = fn;
    }
    showModal() {
      this.open = true;
    }
    close() {
      this.open = false;
    }
    focus() {}
    setAttribute() {}
  }
  const elements = new Map(),
    events = {},
    storage = new Map(),
    timers = [];
  const el = (key) => {
    if (!elements.has(key)) elements.set(key, new Element());
    return elements.get(key);
  };
  const document = {
    querySelector: el,
    body: el("body"),
    documentElement: el("html"),
    visibilityState: "visible",
    addEventListener: () => {},
  };
  const window = { addEventListener: (name, fn) => (events[name] = fn) };
  const sandbox = {
    window,
    document,
    navigator: {},
    matchMedia: () => ({ matches: false }),
    localStorage: {
      getItem: (k) => storage.get(k) || null,
      setItem: (k, v) => storage.set(k, v),
    },
    setTimeout: (fn) => timers.push(fn),
    requestAnimationFrame: () => {},
    ResizeObserver: class {
      observe() {}
    },
    Date,
  };
  vm.runInNewContext(
    readFileSync(new URL("../dist/pwa.mjs", import.meta.url), "utf8"),
    sandbox,
  );
  return { events, storage, el, timers };
}
test("install dialog prompts only after Install, and Not now remembers dismissal", async () => {
  const h = installHarness();
  let prompts = 0,
    prevented = false;
  h.events.beforeinstallprompt({
    preventDefault: () => (prevented = true),
    prompt: async () => prompts++,
    userChoice: Promise.resolve({ outcome: "dismissed" }),
  });
  assert(prevented);
  assert.equal(prompts, 0);
  h.el("#install").handlers.click();
  assert(h.el("#install-dialog").open);
  h.el("#install-later").handlers.click();
  assert(!h.el("#install-dialog").open);
  assert(h.storage.has("little-jungle-install-later"));
  assert.equal(prompts, 0);
  h.el("#install").handlers.click();
  await h.el("#install-now").handlers.click();
  assert.equal(prompts, 1);
  assert(!h.el("#install-dialog").open);
  await h.el("#install-now").handlers.click();
  assert.equal(prompts, 1, "native event can only be used once");
});
test("installed event hides install controls and unsupported browsers get instructions", () => {
  const h = installHarness();
  h.el("#install").handlers.click();
  assert(h.el("#install-now").hidden);
  assert.match(h.el("#install-message").textContent, /Chrome/);
  h.events.appinstalled();
  assert(h.el("#install").hidden);
  assert(!h.el("#install-dialog").open);
});
