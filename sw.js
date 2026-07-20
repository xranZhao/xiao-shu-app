const CACHE_NAME = "xiao-shu-app-v11";
const ASSETS = [
  "/xiao-shu-app/index.html",
  "/xiao-shu-app/style.css",
  "/xiao-shu-app/app.js",
  "/xiao-shu-app/config.js",
  "/xiao-shu-app/xiaoshu-prompt.js",
  "/xiao-shu-app/manifest.json",
  "/xiao-shu-app/icon-192.png",
  "/xiao-shu-app/icon-512.png",
  "/xiao-shu-app/audio/hypnosis.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.log("缓存部分资源失败", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // API 请求不缓存
  if (event.request.url.includes("deepseek.com") || event.request.url.includes("openai")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
