// Firebase Configuration
// Loaded dynamically from the server API endpoint

let firebaseConfig = null;

// Create a promise that resolves when config is loaded
const firebaseConfigReady = (async () => {
  try {
    const response = await fetch('/api/firebase-config');
    if (!response.ok) {
      throw new Error('Failed to load Firebase config');
    }
    firebaseConfig = await response.json();
    window.firebaseConfig = firebaseConfig;
    window.firebaseConfigReady = Promise.resolve();
    return true;
  } catch (error) {
    console.error('Failed to load Firebase config:', error);
    window.firebaseConfigReady = Promise.reject(error);
    return false;
  }
})();

// Make the promise globally available
window.firebaseConfigReady = firebaseConfigReady;
