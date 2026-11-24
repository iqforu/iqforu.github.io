// =====================================================================
//  IQ FOR U – service worker (phone notifications + "Install app")
//  Upload this file to GitHub next to index.html. Do not rename it.
// =====================================================================
let cfg = null;
try { cfg = JSON.parse(atob(new URL(self.location.href).searchParams.get('c') || '')); } catch (e) {}
if (cfg && cfg.apiKey && cfg.messagingSenderId) {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
                'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
  firebase.initializeApp(cfg);
  firebase.messaging();   // shows the notification when the app is closed
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
// No internet → small friendly page instead of the browser error (everything else goes to the network as usual)
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IQ FOR U</title>' +
    '<body style="font-family:system-ui,sans-serif;background:#111318;color:#fff;text-align:center;padding:70px 20px">' +
    '<h2 style="color:#FFE51F;margin:0 0 8px">IQ FOR U</h2><p>No internet connection.<br>Please check your data / Wi-Fi and try again.</p>' +
    '<button onclick="location.reload()" style="margin-top:12px;padding:11px 20px;border-radius:12px;border:0;background:#FFE51F;font-weight:800;font-size:15px">↻ Retry</button></body>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
