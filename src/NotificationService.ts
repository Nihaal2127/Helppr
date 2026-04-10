import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { showLog } from './helper/utility';

const firebaseConfig = {
  apiKey: 'AIzaSyDbvu_VONThJcXYYp_ikMY4_qyXPUVScbE',
  authDomain: 'helppr-bc0ba.firebaseapp.com',
  projectId: 'helppr-bc0ba',
  messagingSenderId: '944474510158',
  appId: '1:944474510158:web:14d411b2c94fc9c8d7041f',
};

const firebaseApp = initializeApp(firebaseConfig);
const messaging = getMessaging(firebaseApp);

export const requestPermission = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      const token = await getToken(messaging, {
        vapidKey: 'BLxRotJ_pgm3JdzjDifCxSCabbm9S70cUuUasqpfSO0Ib6wBoaAJQ7gBdrdQkwwmK3V1IEMbUidJUvRXZWqNMbk',
        serviceWorkerRegistration: swReg,
      });

      showLog('FCM Token:', token);
      onMessageListener();
      return token;
    } else {
      showLog('Notification permission not granted.');
    }
  } catch (err) {
    showLog('Error getting FCM token:', err);
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
      const { title, body } = payload?.notification || {};
      if (Notification.permission === 'granted') {
        new Notification(title || 'Notification', {
          body: body || '',
          icon: '/notification/icon-192x192.png',
        });
        const notificationAudio = new Audio('/notification/notify.wav');
        notificationAudio.load();
        notificationAudio.play().then(() => {
          notificationAudio?.pause();
          notificationAudio.currentTime = 0;
          showLog('✅ Notification sound unlocked');
        }).catch((err) => {
          showLog('⚠️ Failed to unlock audio:', err);
        });

      } else {
        showLog('Foreground Notification permission not granted');
      }
    });
  });
