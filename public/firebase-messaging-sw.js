// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyD2O5VGePAY0OueIN5I48x9Cw__B13ibCw",
    authDomain: "restaurant-system-492af.firebaseapp.com",
    projectId: "restaurant-system-492af",
    storageBucket: "restaurant-system-492af.firebasestorage.app",
    messagingSenderId: "438497022574",
    appId: "1:438497022574:web:8473d3caf0663a61178c7f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: "/icon.png",
  });
});
