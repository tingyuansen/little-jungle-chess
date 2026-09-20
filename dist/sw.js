// Bump with changes to the app shell. New versions activate after old tabs close,
// so a game is never interrupted by a forced reload.
const CACHE = "little-jungle-shell-v4";
const ROOT = new URL("./", self.location.href);
const DEVELOPMENT =
  ROOT.hostname === "localhost" || ROOT.hostname === "127.0.0.1";
const FILES = [
  "./",
  "index.html",
  "style.css",
  "app.mjs",
  "engine.mjs",
  "pwa.mjs",
  "manifest.webmanifest",
  "assets/animals.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-180.png",
  "fonts/baloo-2.ttf",
  "fonts/nunito.ttf",
];
const urls = FILES.map((path) => new URL(path, ROOT).href);
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(urls.map((url) => new Request(url, { cache: "reload" }))),
      )
      .then(() => (DEVELOPMENT ? self.skipWaiting() : undefined)),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("little-jungle-shell-") && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== ROOT.origin) return;
  // Only cache the public game shell, never unrelated URLs or account pages.
  const key =
    event.request.mode === "navigate" &&
    (url.pathname === ROOT.pathname ||
      url.pathname === new URL("index.html", ROOT).pathname)
      ? ROOT.href
      : url.href;
  if (!urls.includes(key)) return;
  event.respondWith(
    caches
      .open(CACHE)
      .then(async (cache) =>
        DEVELOPMENT
          ? fetch(event.request).catch(() => cache.match(key))
          : (await cache.match(key)) || fetch(event.request),
      ),
  );
});
