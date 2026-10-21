'use strict';
const CACHE='nosso-sim-prototipo-v8';
const FILES=['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nosso-sim-prototipo-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(new URL(event.request.url).pathname.startsWith('/api/')||new URL(event.request.url).pathname.endsWith('/conteudo.js'))return;if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin||event.request.headers.has('range'))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});
