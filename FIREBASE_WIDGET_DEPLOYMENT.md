# Widget Code Deployment to Firebase

This guide explains how to deploy your widget code to Firebase and access it from your client application.

## Architecture Overview

```
Your Website
    ↓
Loads embed script (from Firebase/Replit)
    ↓
widget.js initializes
    ↓
Calls /api/voice & /api/chat endpoints (your backend)
```

## Option 1: Firebase Hosting (Recommended)

### Step 1: Deploy widget.js to Firebase Hosting

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Initialize Firebase in your project (if not done)
firebase init hosting

# Build your project
npm run build

# Deploy
firebase deploy --only hosting
```

### Step 2: Configure firebase.json

```json
{
  "hosting": {
    "public": "client/public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/widget.js",
        "destination": "/widget.js"
      }
    ]
  }
}
```

### Step 3: After Deployment

Your widget.js will be available at:
```
https://<YOUR_FIREBASE_PROJECT>.web.app/widget.js
```

### Step 4: Set Environment Variable

Add to your `.env`:
```
FIREBASE_WIDGET_URL=https://<YOUR_FIREBASE_PROJECT>.web.app/widget.js
```

## Option 2: Firebase Cloud Storage

Store widget code in Cloud Storage:

```bash
# Upload to Cloud Storage
gsutil cp client/public/widget.js gs://your-bucket/widget.js

# Make publicly readable
gsutil acl ch -u AllUsers:R gs://your-bucket/widget.js
```

Then access via:
```
https://storage.googleapis.com/your-bucket/widget.js
```

Set in `.env`:
```
FIREBASE_WIDGET_URL=https://storage.googleapis.com/your-bucket/widget.js
```

## How Your Client Loads the Widget

### Automatically (Using Your Backend)

1. Admin creates a business
2. Admin gets embed code from: `GET /api/widget/code/:businessId`
3. Backend checks for `FIREBASE_WIDGET_URL` environment variable
4. If set, uses Firebase URL; otherwise uses local domain
5. Admin copies embed code to their website

### Direct Firebase URL

Admin can also directly use:
```html
<script>
  window.AIVoiceWidgetConfig = {
    businessId: "biz_xxx"
  };
</script>
<script src="https://your-firebase-project.web.app/widget.js"></script>
<ai-voice-widget></ai-voice-widget>
```

## Available API Endpoints

### Get Embed Code
```
GET /api/widget/code/:businessId
```

Response:
```json
{
  "businessId": "biz_xxx",
  "embedCode": "<!-- HTML embed code -->",
  "widgetUrl": "https://your-project.web.app/widget.js"
}
```

### Generate Embed Script
```
GET /api/widget/embed?businessId=biz_xxx&firebaseUrl=https://...
```

### Check Deploy Status
```
POST /api/widget/deploy-status
```

Response:
```json
{
  "deployed": true,
  "firebaseUrl": "https://your-project.web.app/widget.js"
}
```

## Implementation in Admin Dashboard

When an admin creates a business:

1. Show widget embed code from `/api/widget/code/:businessId`
2. Admin can copy-paste into their website
3. The code automatically points to Firebase if configured, otherwise local domain

Example:
```typescript
const response = await fetch(`/api/widget/code/${businessId}`);
const { embedCode, widgetUrl } = await response.json();
```

## How Widget Accesses Backend APIs

The widget communicates with your backend for:

1. **Voice API**: `POST /api/voice` - Text-to-speech
2. **Chat API**: `POST /api/chat` - AI conversation

These endpoints can be accessed from **anywhere** (Firebase, local, other domains) because they're CORS-enabled:

```javascript
// Inside widget.js
const voiceBackendUrl = window.AIVoiceWidgetConfig?.voiceBackendUrl ||
                        "https://your-domain.com/api/voice";

fetch(voiceBackendUrl, {
  method: "POST",
  body: JSON.stringify({ text, language, gender })
});
```

## Environment Variables Needed

```env
# Firebase Configuration
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...

# Widget Deployment (optional - defaults to current domain)
FIREBASE_WIDGET_URL=https://<project>.web.app/widget.js

# Voice Backend (optional - auto-detected from request)
VOICE_BACKEND_URL=https://your-domain.com/api/voice
```

## Testing Locally

Before deploying to Firebase:

1. Keep widget.js locally served from `http://localhost:5000/widget.js`
2. Test embedding on another website
3. Verify `/api/voice` and `/api/chat` work
4. Then deploy to Firebase

## Troubleshooting

### Widget loads but doesn't work
- Check browser console for CORS errors
- Verify backend URL is correct in `AIVoiceWidgetConfig`
- Check network tab to see API calls

### "businessId is required"
- Ensure embed code has `businessId` in config
- Check `AIVoiceWidgetConfig` object

### Firebase deployment fails
- Run `firebase login` first
- Check Firebase project ID matches
- Ensure `client/public/widget.js` exists

## Summary

- **Widget.js deployment**: Firebase Hosting or Cloud Storage
- **Backend APIs**: Always on your Replit domain (auto-detected by widget)
- **Access pattern**: Website → Firebase widget.js → Your backend APIs
- **Configuration**: Set `FIREBASE_WIDGET_URL` in .env
