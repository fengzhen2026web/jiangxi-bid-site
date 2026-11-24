/* 冯珍投标工作台 Service Worker — v6 (安装引导横幅 + manifest id) */
const CACHE = "fengzhen-bid-v6";
const RUNTIME = "fengzhen-bid-rt-v6";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(PRECACHE).catch(function(err){
        console.warn("SW precache partial:", err);
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.map(function(k){ return caches.delete(k); })  // 全部清空，重新缓存
      );
    })
  );
  clients.claim();
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;            // 非 GET 直接放行
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 跨域（如 PDF.js CDN）放行给网络

  // HTML / 导航：网络优先，离线回退缓存（保证代码更新立即生效）
  if (req.mode === "navigate" || url.pathname.endsWith(".html")) {
    e.respondWith(
      fetch(req).then(function(resp){
        var copy = resp.clone();
        caches.open(RUNTIME).then(function(c){ c.put(req, copy); });
        return resp;
      }).catch(function(){
        return caches.match(req).then(function(r){ return r || caches.match("./index.html"); });
      })
    );
    return;
  }

  // 静态资源（图标/manifest/js）：缓存优先，回源补充
  e.respondWith(
    caches.match(req).then(function(r){
      if (r) return r;
      return fetch(req).then(function(resp){
        if (resp && resp.status === 200 && resp.type === "basic") {
          var copy = resp.clone();
          caches.open(RUNTIME).then(function(c){ c.put(req, copy); });
        }
        return resp;
      }).catch(function(){ return r; });
    })
  );
});
