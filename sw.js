// キャッシュの世代番号です。更新時は v3 のように上げます。
const CACHE_VERSION = "v2";
const CACHE_NAME = `crc-lab-${CACHE_VERSION}`;

// install 時に先に保存しておくファイル一覧です。
const APP_SHELL_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./lab_data.json",
  "./crc.pdf",
  "./icon-256.png",
  "./icon-512.png",
  "./pdfjs/web/viewer.html",
  "./pdfjs/web/viewer.css",
  "./pdfjs/web/viewer.mjs",
  "./pdfjs/build/pdf.mjs",
  "./pdfjs/build/pdf.worker.mjs",
  "./pdfjs/build/pdf.sandbox.mjs",
  "./pdfjs/web/locale/locale.json",
  "https://cdn.tailwindcss.com"
];

// install: 基本ファイルを事前キャッシュします。
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL_CACHE);
      // 既存タブの終了を待たず、新しい SW を有効化します。
      self.skipWaiting();
    })()
  );
});

// activate: 古い世代のキャッシュを削除して整理します。
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => caches.delete(oldKey))
      );
      // 既に開いているページにもこの SW を即時適用します。
      await self.clients.claim();
    })()
  );
});

// キャッシュ可能なレスポンスか判定します。
// opaque は一部 CDN 応答で発生するため許可します。
function isCacheableResponse(response) {
  return response && (response.ok || response.type === "opaque");
}

// 同一オリジン（同じサイト）か判定します。
function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

// runtime cache の対象リクエストを判定します。
function shouldRuntimeCache(request, url) {
  if (request.method !== "GET") return false;
  if (!isSameOrigin(url)) return false;

  const { pathname } = url;
  return (
    pathname.endsWith(".pdf") ||
    pathname.includes("/pdfjs/") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".mjs") ||
    pathname.endsWith(".ftl") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg")
  );
}

// cacheを効きやすくするためのあれこれ:
// 1) キャッシュがあれば返す
// 2) なければ通信で取得
// 3) 取得成功レスポンスをキャッシュ保存
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

// fetch: 対象リソースは cache-first で返します。
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!shouldRuntimeCache(request, url)) return;

  event.respondWith(
    cacheFirst(request).catch(async () => {
      const fallback = await caches.match(request);
      if (fallback) return fallback;
      return Response.error();
    })
  );
});