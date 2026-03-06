const CACHE_NAME = 'crc-lab-v1'; // ← 更新時はここを v2 に書き換える
const PRE_CACHE = [
  './',
  './index.html',
  './lab_data.json',
  './crc.pdf',
  'https://cdn.tailwindcss.com'
];

// インストール時に基本ファイルをキャッシュ
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE))
  );
  self.skipWaiting();
});

// 古いキャッシュの削除
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
});

// 読み込み処理（pdfjsの細かいファイルも一度読み込んだらキャッシュする）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // 動的にキャッシュへ追加
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});