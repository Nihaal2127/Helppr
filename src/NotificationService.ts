import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
} from 'firebase/messaging';
import type { Messaging } from 'firebase/messaging';
import { showLog } from './helper/utility';

const firebaseConfig = {
  apiKey: 'AIzaSyDbvu_VONThJcXYYp_ikMY4_qyXPUVScbE',
  authDomain: 'helppr-bc0ba.firebaseapp.com',
  projectId: 'helppr-bc0ba',
  messagingSenderId: '944474510158',
  appId: '1:944474510158:web:14d411b2c94fc9c8d7041f',
};

let firebaseApp: FirebaseApp | undefined;
let messaging: Messaging | undefined;

/** FCM only works on HTTPS or localhost; HTTP S3 website hosting will skip messaging safely. */
async function getMessagingIfSupported(): Promise<Messaging | null> {
  try {
    if (!(await isSupported())) {
      showLog('FCM: browser or context does not support Firebase Messaging (use HTTPS or localhost).');
      return null;
    }
    if (!firebaseApp) {
      firebaseApp = initializeApp(firebaseConfig);
    }
    if (!messaging) {
      messaging = getMessaging(firebaseApp);
    }
    return messaging;
  } catch (err) {
    showLog('FCM: initialization skipped:', err);
    return null;
  }
}

export const requestPermission = async () => {
  try {
    const messagingInstance = await getMessagingIfSupported();
    if (!messagingInstance) {
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      const token = await getToken(messagingInstance, {
        vapidKey: 'BLxRotJ_pgm3JdzjDifCxSCabbm9S70cUuUasqpfSO0Ib6wBoaAJQ7gBdrdQkwwmK3V1IEMbUidJUvRXZWqNMbk',
        serviceWorkerRegistration: swReg,
      });

      showLog('FCM Token:', token);
      onMessageListener(messagingInstance);
      return token;
    } else {
      showLog('Notification permission not granted.');
    }
  } catch (err) {
    showLog('Error getting FCM token:', err);
  }
};

export const onMessageListener = (messagingInstance: Messaging) =>
  new Promise((resolve) => {
    onMessage(messagingInstance, (payload) => {
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
