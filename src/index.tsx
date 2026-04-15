import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";

import App from "./App";


// if (typeof window !== "undefined" && window.ResizeObserver) {
//   const OriginalResizeObserver = window.ResizeObserver;
//   window.ResizeObserver = class extends OriginalResizeObserver {
//     constructor(callback: ResizeObserverCallback) {
//       super((entries, observer) => {
//         window.requestAnimationFrame(() => {
//           callback(entries, observer);
//         });
//       });
//     }
//   };
// }

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById("root")
);

// ✅ Register Firebase Messaging service worker
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker
//       .register('/firebase-messaging-sw.js')
//       .then((registration) => {
//         console.log('✅ Service Worker registered:', registration);
//       })
//       .catch((error) => {
//         console.error('❌ Service Worker registration failed:', error);
//       });
//   });
// }