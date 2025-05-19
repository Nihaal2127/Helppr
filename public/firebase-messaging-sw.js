// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDzaqzSJk94bou_yWMt6aQFbCHtrG_xbHE',
  authDomain: 'logicraft-infotech.firebaseapp.com',
  projectId: 'logicraft-infotech',
  messagingSenderId: '827992132800',
  appId: '1:827992132800:web:5508462ff14cf02e7bb125',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon.png', // optional
  });
});
