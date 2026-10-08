/* Service worker: membuat aplikasi tetap jalan tanpa internet.
   Naikkan VERSION setiap kali index.html diubah, supaya cache lama dibuang. */
const VERSION = "ujung-jari-v22";
const SHELL = VERSION + "-shell";
const FONTS = VERSION + "-fonts";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
  "./data/profesi.js",
  "./data/buah.js",
  "./data/kereta.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.indexOf(VERSION) !== 0).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

  /* Font Andika: pakai cache bila ada, kalau belum ambil online lalu simpan.
     Saat offline dan belum tersimpan, halaman jatuh ke font bawaan sistem. */
  if (isFont) {
    e.respondWith(
      caches.open(FONTS).then((cache) =>
        cache.match(req).then((hit) =>
          hit || fetch(req).then((res) => {
            cache.put(req, res.clone()).catch(() => {});
            return res;
          }).catch(() => hit)
        )
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  /* Halaman: coba jaringan dulu supaya versi baru terbaca, offline pakai cache. */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put("./index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html").then((hit) => hit || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(SHELL).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
