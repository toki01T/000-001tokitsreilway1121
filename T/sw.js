const CACHE_NAME = 'toki01tm-v1.1.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './pwa-return-manager.js'
];

// PWA復帰管理用の変数
let pwaPrintCallbackData = null;

// インストール時のキャッシュ処理
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('キャッシュを開きました');
        return cache.addAll(urlsToCache);
      })
  );
});

// フェッチイベントの処理（オフライン対応）
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // キャッシュにあればそれを返す
        if (response) {
          return response;
        }
        
        // キャッシュになければネットワークから取得
        return fetch(event.request).then(
          function(response) {
            // 無効なレスポンスは処理しない
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // レスポンスをクローンしてキャッシュに保存
            var responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      }
    )
  );
});

// アクティベート時の古いキャッシュ削除
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// PWA復帰用のメッセージハンドリング
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'PWA_PRINT_PREPARE') {
    console.log('SW: PWA印刷準備受信', event.data);
    pwaPrintCallbackData = {
      timestamp: Date.now(),
      originalUrl: event.data.originalUrl,
      mode: event.data.mode,
      isPWA: event.data.isPWA
    };
  } else if (event.data && event.data.type === 'PWA_PRINT_CALLBACK') {
    console.log('SW: PWA印刷コールバック受信');
    // クライアントにPWA復帰を指示
    event.ports[0].postMessage({
      type: 'PWA_RETURN_REQUIRED',
      data: pwaPrintCallbackData
    });
  }
});

// PWA復帰のためのウィンドウフォーカス処理
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'return_to_pwa') {
    event.waitUntil(
      clients.matchAll({type: 'window'}).then(function(clientList) {
        // 既存のPWAクライアントがあれば、それにフォーカス
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('utm_source=homescreen') || 
              client.url.includes('display-mode=standalone')) {
            return client.focus();
          }
        }
        
        // PWAクライアントがなければ新しく開く
        if (clients.openWindow) {
          const pwaUrl = self.registration.scope + '?utm_source=homescreen&pwa_return=sw';
          return clients.openWindow(pwaUrl);
        }
      })
    );
  }
});
