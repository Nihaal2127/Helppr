// src/NotificationService.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyDzaqzSJk94bou_yWMt6aQFbCHtrG_xbHE',
  authDomain: 'logicraft-infotech.firebaseapp.com',
  projectId: 'logicraft-infotech',
  messagingSenderId: '827992132800',
  appId: '1:827992132800:web:5508462ff14cf02e7bb125',
};

const firebaseApp = initializeApp(firebaseConfig);
const messaging = getMessaging(firebaseApp);

export const requestPermission = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('Notification permission granted.');

      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      const token = await getToken(messaging, {
        vapidKey: 'BJUHKd3FSufYi04Wh4BoxoMrkHuPaxMI6uEe28Tvv88J1BeHlg5KOwbQIWDLM18DsFPePvq2wkefKA9VlD8n2lw',
        serviceWorkerRegistration: swReg,
      });

      console.log('FCM Token:', token);
      return token;
    } else {
      console.warn('Notification permission not granted.');
    }
  } catch (err) {
    console.error('Error getting FCM token:', err);
  }
};

export const onMessageListener = () =>
  console.log('onMessageListener ');
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('Foreground Message data',payload);
      resolve(payload);
    });
  });
