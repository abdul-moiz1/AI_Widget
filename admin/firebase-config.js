// Firebase Configuration
// Loaded dynamically from the server API endpoint

let firebaseConfig = null;

// Fetch Firebase config from server
async function loadFirebaseConfig() {
  try {
    const response = await fetch('/api/firebase-config');
    if (!response.ok) {
      throw new Error('Failed to load Firebase config');
    }
    firebaseConfig = await response.json();
    window.firebaseConfig = firebaseConfig;
    return true;
  } catch (error) {
    console.error('Failed to load Firebase config:', error);
    return false;
  }
}

// Initialize config when module loads
loadFirebaseConfig();
