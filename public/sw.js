// Nama cache diubah untuk memaksa pembaruan jika ada versi sebelumnya
const CACHE_NAME = 'rasa-cache-v3'; 
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',      // BARU: Menambahkan file CSS ke cache
  '/script.js',      // BARU: Menambahkan file JavaScript ke cache
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 1. Proses Instalasi: Menyimpan file ke cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache dibuka. Menambahkan file inti ke cache.');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Proses Fetch: Mengambil file dari cache jika offline
self.addEventListener('fetch', event => {
  // Jangan cache permintaan API, selalu ambil dari jaringan
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika file ada di cache, kembalikan dari cache.
        // Jika tidak, ambil dari jaringan.
        return response || fetch(event.request);
      }
    )
  );
});

// 3. Proses Aktivasi: Membersihkan cache lama
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME]; 
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Jika cache lama tidak ada di dalam whitelist, maka hapus
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
