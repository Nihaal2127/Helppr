import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { showLog } from './helper/utility';

const firebaseConfig = {
  apiKey: 'AIzaSyDbvu_VONThJcXYYp_ikMY4_qyXPUVScbE',
  authDomain: 'helppr-bc0ba.firebaseapp.com',
  projectId: 'helppr-bc0ba',
  messagingSenderId: '944474510158',
  appId: '1:944474510158:web:14d411b2c94fc9c8d7041f',
};

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

type MessagingInstance = ReturnType<typeof getMessaging>;

let messagingInstance: MessagingInstance | null = null;
let messagingInitPromise: Promise<MessagingInstance | null> | null = null;

/**
 * Firebase Messaging must not be initialized at module load: unsupported browsers
 * throw (e.g. messaging/unsupported-browser) and break the whole app (React #311).
 */
async function getMessagingWhenSupported(): Promise<MessagingInstance | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  if (messagingInstance) {
    return messagingInstance;
  }
  if (!messagingInitPromise) {
    messagingInitPromise = (async () => {
      try {
        if (!(await isSupported())) {
          showLog('Firebase Messaging: unsupported in this browser/environment.');
          return null;
        }
        messagingInstance = getMessaging(firebaseApp);
        return messagingInstance;
      } catch (err) {
        showLog('Firebase Messaging init failed:', err);
        return null;
      }
    })();
  }
  return messagingInitPromise;
}

export const requestPermission = async () => {
  try {
    const messaging = await getMessagingWhenSupported();
    if (!messaging) {
      return;
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      showLog('Notifications or Service Worker API not available.');
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      const token = await getToken(messaging, {
        vapidKey: 'BLxRotJ_pgm3JdzjDifCxSCabbm9S70cUuUasqpfSO0Ib6wBoaAJQ7gBdrdQkwwmK3V1IEMbUidJUvRXZWqNMbk',
        serviceWorkerRegistration: swReg,
      });

      showLog('FCM Token:', token);
      void onMessageListener(messaging);
      return token;
    } else {
      showLog('Notification permission not granted.');
    }
  } catch (err) {
    showLog('Error getting FCM token:', err);
  }
};

export const onMessageListener = (messaging: MessagingInstance) =>
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
