// Firebase Configuration
// Replace these values with your Firebase project configuration
// Get these from: Firebase Console > Project Settings > General > Your apps > Web app

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Export for use in app.js
window.firebaseConfig = firebaseConfig;
