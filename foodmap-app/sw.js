// 離線快取：App 本體 + 看過的地圖區塊，在日本網路不穩時也能打開
const VER = "foodmap-v1";
const SHELL = ["./", "index.html", "style.css", "app.js", "data.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"];
const TILES = "foodmap-tiles";
self.addEventListener("install", e => { e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request; if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.hostname === "tile.openstreetmap.org"){
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if(r.ok){ c.put(req, r.clone()); trim(c); } return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if(url.origin === location.origin || url.hostname === "unpkg.com"){
    // 先用網路拿最新版，沒網路再用快取
    e.respondWith(fetch(req).then(r => { if(r.ok){ const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
  }
});
let trimming = false;
async function trim(c){
  if(trimming) return; trimming = true;
  const keys = await c.keys(); const extra = keys.length - 1500;
  for(let i = 0; i < extra; i++) await c.delete(keys[i]);
  trimming = false;
}
