// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Initialize Firebase
let db = null;
let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return true;
  
  const config = window.firebaseConfig;
  if (!config || config.apiKey === "YOUR_API_KEY") {
    showToast('Please configure Firebase in firebase-config.js', 'error');
    return false;
  }
  
  try {
    const app = initializeApp(config);
    db = getFirestore(app);
    firebaseInitialized = true;
    return true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    showToast('Failed to initialize Firebase', 'error');
    return false;
  }
}

// State
let currentBusinessId = null;

// Router
function navigateTo(path) {
  window.location.hash = path;
}

function handleRoute() {
  const hash = window.location.hash || '#/';
  const path = hash.slice(1);
  
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  
  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  if (path === '/' || path === '') {
    document.getElementById('page-list').classList.remove('hidden');
    document.querySelector('[data-page="list"]').classList.add('active');
    loadBusinesses();
  } else if (path === '/add') {
    document.getElementById('page-add').classList.remove('hidden');
    document.querySelector('[data-page="add"]').classList.add('active');
    renderForm('add-form-container', null);
  } else if (path.startsWith('/edit/')) {
    const id = path.split('/edit/')[1];
    currentBusinessId = id;
    document.getElementById('page-edit').classList.remove('hidden');
    loadBusinessForEdit(id);
  }
}

// Toast notifications
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// Generate unique ID
function generateId() {
  return 'biz_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Load all businesses
async function loadBusinesses() {
  const container = document.getElementById('businesses-list');
  
  if (!initFirebase()) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Firebase not configured. Please update firebase-config.js with your credentials.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '<div class="loading">Loading businesses...</div>';
  
  try {
    const querySnapshot = await getDocs(collection(db, 'businesses'));
    const businesses = [];
    
    querySnapshot.forEach((doc) => {
      businesses.push({ id: doc.id, ...doc.data() });
    });
    
    if (businesses.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4"></path>
          </svg>
          <p>No businesses yet</p>
          <button class="btn btn-primary" onclick="navigateTo('/add')">Add Your First Business</button>
        </div>
      `;
      return;
    }
    
    container.innerHTML = businesses.map(biz => `
      <div class="business-card" data-testid="card-business-${biz.id}">
        <div class="business-info">
          <h3>${escapeHtml(biz.businessName || 'Unnamed Business')}</h3>
          <div class="business-id">${biz.id}</div>
          <div class="business-status">
            <span class="status-dot ${biz.status || 'active'}"></span>
            ${biz.status || 'active'}
          </div>
        </div>
        <div class="business-actions">
          <button class="btn btn-secondary" onclick="navigateTo('/edit/${biz.id}')" data-testid="button-edit-${biz.id}">
            Edit
          </button>
          <button class="btn btn-danger" onclick="deleteBusiness('${biz.id}')" data-testid="button-delete-${biz.id}">
            Delete
          </button>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading businesses:', error);
    container.innerHTML = `
      <div class="empty-state">
        <p>⚠️ Unable to access Firestore database.</p>
        <p style="font-size: 0.9em; margin-top: 10px; opacity: 0.8;">This typically means your Firestore security rules deny access. Check your Firebase Console Firestore security rules and allow read/write access.</p>
        <p style="font-size: 0.85em; margin-top: 10px; color: #999;">Error: ${error.message || 'Unknown error'}</p>
      </div>
    `;
  }
}

// Load business for editing
async function loadBusinessForEdit(id) {
  const container = document.getElementById('edit-form-container');
  
  if (!initFirebase()) {
    container.innerHTML = '<div class="empty-state">Firebase not configured</div>';
    return;
  }
  
  container.innerHTML = '<div class="loading">Loading business...</div>';
  
  try {
    const docRef = doc(db, 'businesses', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      container.innerHTML = '<div class="empty-state">Business not found</div>';
      return;
    }
    
    const business = { id: docSnap.id, ...docSnap.data() };
    renderForm('edit-form-container', business);
    
  } catch (error) {
    console.error('Error loading business:', error);
    container.innerHTML = '<div class="empty-state">Error loading business</div>';
  }
}

// Render form (for both add and edit)
function renderForm(containerId, business) {
  const container = document.getElementById(containerId);
  const isEdit = !!business;
  const formId = isEdit ? 'edit-form' : 'add-form';
  
  const ctx = business?.context || {};
  const widget = business?.widget || {};
  const theme = widget.theme || {};
  const voice = business?.voice || {};
  
  container.innerHTML = `
    <form id="${formId}" class="form-container" data-form-type="${isEdit ? 'edit' : 'add'}">
      <div class="form-section">
        <h3 class="form-section-title">Business Info</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Business Name</label>
            <input type="text" name="businessName" required 
                   value="${escapeHtml(business?.businessName || '')}"
                   placeholder="e.g., ABC Restaurant"
                   data-testid="input-business-name">
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status" data-testid="select-status">
              <option value="active" ${(business?.status || 'active') === 'active' ? 'selected' : ''}>Active</option>
              <option value="inactive" ${business?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3 class="form-section-title">Business Context</h3>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" 
                    placeholder="Describe the business for the AI assistant..."
                    data-testid="input-description">${escapeHtml(ctx.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Services</label>
          <input type="text" name="services" 
                 value="${escapeHtml((ctx.services || []).join(', '))}"
                 placeholder="e.g., Dine-in, Takeaway, Delivery"
                 data-testid="input-services">
          <div class="form-help">Comma-separated list of services</div>
        </div>
        <div class="form-group">
          <label>Business Hours</label>
          <input type="text" name="hours" 
                 value="${escapeHtml(ctx.hours || '')}"
                 placeholder="e.g., Daily 11 AM to 11 PM"
                 data-testid="input-hours">
        </div>
        <div class="form-group">
          <label>AI Rules</label>
          <textarea name="rules" 
                    placeholder="One rule per line. These guide the AI's behavior."
                    data-testid="input-rules">${escapeHtml((ctx.rules || []).join('\n'))}</textarea>
          <div class="form-help">One rule per line (e.g., "Always greet warmly")</div>
        </div>
      </div>
      
      <div class="form-section">
        <h3 class="form-section-title">Widget Settings</h3>
        <div class="form-group">
          <label>Logo URL</label>
          <input type="url" name="logoUrl" 
                 value="${escapeHtml(widget.logoUrl || '')}"
                 placeholder="https://example.com/logo.png"
                 data-testid="input-logo-url">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Primary Color</label>
            <div class="color-preview">
              <input type="color" name="primaryColor" 
                     value="${theme.primaryColor || '#0ea5e9'}"
                     data-testid="input-primary-color">
              <span class="color-value">${theme.primaryColor || '#0ea5e9'}</span>
            </div>
          </div>
          <div class="form-group">
            <label>Theme Mode</label>
            <div class="toggle-container">
              <span>Light</span>
              <div class="toggle theme-toggle ${(theme.mode || 'dark') === 'dark' ? 'active' : ''}" 
                   data-testid="toggle-theme">
                <div class="toggle-knob"></div>
              </div>
              <span>Dark</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3 class="form-section-title">Voice Settings</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Language</label>
            <select name="language" data-testid="select-language">
              <option value="en" ${voice.language === 'en' ? 'selected' : ''}>English</option>
              <option value="es" ${voice.language === 'es' ? 'selected' : ''}>Spanish</option>
              <option value="fr" ${voice.language === 'fr' ? 'selected' : ''}>French</option>
              <option value="de" ${voice.language === 'de' ? 'selected' : ''}>German</option>
              <option value="it" ${voice.language === 'it' ? 'selected' : ''}>Italian</option>
              <option value="pt" ${voice.language === 'pt' ? 'selected' : ''}>Portuguese</option>
              <option value="ja" ${voice.language === 'ja' ? 'selected' : ''}>Japanese</option>
              <option value="zh" ${voice.language === 'zh' ? 'selected' : ''}>Mandarin Chinese</option>
            </select>
          </div>
          <div class="form-group">
            <label>Voice Gender</label>
            <select name="voiceGender" data-testid="select-voice-gender">
              <option value="neutral" ${voice.voiceGender === 'neutral' ? 'selected' : ''}>Neutral</option>
              <option value="male" ${voice.voiceGender === 'male' ? 'selected' : ''}>Male</option>
              <option value="female" ${voice.voiceGender === 'female' ? 'selected' : ''}>Female</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Speaking Speed: <span class="slider-value" id="speedValue">${voice.speakingSpeed || 1}</span></label>
          <input type="range" name="speakingSpeed" min="0.5" max="2" step="0.1" 
                 value="${voice.speakingSpeed || 1}"
                 class="voice-slider"
                 data-testid="slider-speaking-speed">
          <div class="form-help">0.5x (Slow) to 2x (Fast)</div>
        </div>
        <div class="form-group">
          <label>Pitch: <span class="slider-value" id="pitchValue">${voice.pitch || 1}</span></label>
          <input type="range" name="pitch" min="0.5" max="2" step="0.1" 
                 value="${voice.pitch || 1}"
                 class="voice-slider"
                 data-testid="slider-pitch">
          <div class="form-help">0.5 (Lower) to 2 (Higher)</div>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" data-testid="button-save">
          ${isEdit ? 'Save Changes' : 'Create Business'}
        </button>
        <button type="button" class="btn btn-ghost" onclick="navigateTo('/')" data-testid="button-cancel">
          Cancel
        </button>
      </div>
    </form>
    
    ${isEdit ? renderScriptGenerator(business.id) : ''}
  `;
  
  const form = document.getElementById(formId);
  
  // Color picker sync within form context
  const colorInput = form.querySelector('input[name="primaryColor"]');
  const colorValue = form.querySelector('.color-value');
  colorInput.addEventListener('input', (e) => {
    colorValue.textContent = e.target.value;
  });
  
  // Theme toggle within form context
  const themeToggle = form.querySelector('.theme-toggle');
  themeToggle.addEventListener('click', () => {
    themeToggle.classList.toggle('active');
  });
  
  // Voice slider listeners
  const speedSlider = form.querySelector('input[name="speakingSpeed"]');
  const pitchSlider = form.querySelector('input[name="pitch"]');
  const speedValue = form.querySelector('#speedValue');
  const pitchValue = form.querySelector('#pitchValue');
  
  if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
      speedValue.textContent = parseFloat(e.target.value).toFixed(1);
    });
  }
  
  if (pitchSlider) {
    pitchSlider.addEventListener('input', (e) => {
      pitchValue.textContent = parseFloat(e.target.value).toFixed(1);
    });
  }
  
  // Form submit handler within form context
  form.addEventListener('submit', (e) => handleSubmit(e, isEdit));
}

// Render script generator
function renderScriptGenerator(businessId) {
  const widgetHost = window.location.origin;
  const script = `<script>
  window.AIVoiceWidgetConfig = {
    businessId: "${businessId}"
  };
<\/script>
<script src="${widgetHost}/widget.js"><\/script>`;

  return `
    <div class="script-container">
      <div class="script-header">
        <h3>Widget Embed Code</h3>
        <button class="btn btn-secondary" onclick="copyScript('${businessId}')" data-testid="button-copy-script">
          Copy to Clipboard
        </button>
      </div>
      <pre class="script-code" id="script-${businessId}">${escapeHtml(script)}</pre>
    </div>
  `;
}


// Copy script to clipboard
async function copyScript(businessId) {
  const widgetHost = window.location.origin;
  const script = `<script>
  window.AIVoiceWidgetConfig = {
    businessId: "${businessId}"
  };
</script>
<script src="${widgetHost}/widget.js"></script>`;

  try {
    await navigator.clipboard.writeText(script);
    showToast('Script copied to clipboard!', 'success');
  } catch (error) {
    showToast('Failed to copy script', 'error');
  }
}

// Handle form submission
async function handleSubmit(event, isEdit) {
  event.preventDefault();
  
  if (!initFirebase()) return;
  
  const form = event.target;
  const formData = new FormData(form);
  
  const businessId = isEdit ? currentBusinessId : generateId();
  
  // Get theme toggle from within the submitted form
  const themeToggle = form.querySelector('.theme-toggle');
  
  const data = {
    businessName: formData.get('businessName'),
    status: formData.get('status'),
    context: {
      description: formData.get('description'),
      services: formData.get('services').split(',').map(s => s.trim()).filter(Boolean),
      hours: formData.get('hours'),
      rules: formData.get('rules').split('\n').map(r => r.trim()).filter(Boolean)
    },
    widget: {
      logoUrl: formData.get('logoUrl'),
      theme: {
        primaryColor: formData.get('primaryColor'),
        mode: themeToggle.classList.contains('active') ? 'dark' : 'light'
      }
    },
    voice: {
      language: formData.get('language'),
      voiceGender: formData.get('voiceGender'),
      speakingSpeed: parseFloat(formData.get('speakingSpeed')),
      pitch: parseFloat(formData.get('pitch'))
    },
    updatedAt: serverTimestamp()
  };
  
  if (!isEdit) {
    data.createdAt = serverTimestamp();
  }
  
  try {
    await setDoc(doc(db, 'businesses', businessId), data, { merge: true });
    showToast(isEdit ? 'Business updated!' : 'Business created!', 'success');
    navigateTo('/');
  } catch (error) {
    console.error('Error saving business:', error);
    showToast('Failed to save business', 'error');
  }
}

// Delete business
async function deleteBusiness(id) {
  if (!confirm('Are you sure you want to delete this business?')) return;
  
  if (!initFirebase()) return;
  
  try {
    await deleteDoc(doc(db, 'businesses', id));
    showToast('Business deleted', 'success');
    loadBusinesses();
  } catch (error) {
    console.error('Error deleting business:', error);
    showToast('Failed to delete business', 'error');
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Expose functions globally
window.navigateTo = navigateTo;
window.deleteBusiness = deleteBusiness;
window.copyScript = copyScript;

// Initialize
window.addEventListener('hashchange', handleRoute);
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for Firebase config to be loaded
  try {
    await window.firebaseConfigReady;
    handleRoute();
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    showToast('Firebase configuration failed', 'error');
  }
});
