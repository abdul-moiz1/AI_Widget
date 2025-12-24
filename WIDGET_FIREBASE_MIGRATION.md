# Migrating widget.js to Firebase (Step-by-Step)

## Current Setup (Replit-dependent)
```
Widget in Replit
    ↓
Calls /api/voice (Replit endpoint)
    ↓
Audio response
```

## New Setup (Firebase-independent)
```
Widget in Firebase
    ↓
Calls Cloud Function
    ↓
Audio response
```

## Changes Needed in widget.js

### Before (Current)
```javascript
// Line 40 in client/public/widget.js
const CONFIG = {
  backendUrl: 'https://chat-cgdxljuoea-uc.a.run.app',
  voiceBackendUrl: voiceBackendUrl,  // This points to /api/voice on your domain
  theme: { ... }
};
```

### After (Firebase)
```javascript
// Replace with Cloud Function URL
const CONFIG = {
  backendUrl: 'https://your-region-your-project.cloudfunctions.net/generateResponse',
  voiceBackendUrl: 'https://your-region-your-project.cloudfunctions.net/generateVoice',
  theme: { ... }
};
```

---

## Step-by-Step Implementation

### 1. Create Firebase Functions Directory

```bash
firebase init functions
cd functions
npm install @google-cloud/text-to-speech
```

### 2. Create Voice Function (functions/index.js)

```javascript
const functions = require("firebase-functions");
const textToSpeech = require("@google-cloud/text-to-speech");

const client = new textToSpeech.TextToSpeechClient();

// Voice Generation Function
exports.generateVoice = functions.https.onRequest(async (req, res) => {
  // CORS
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { text, language = "en-US", gender = "NEUTRAL", pitch = 1.0, speakingRate = 1.0 } = req.body;

    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    const request = {
      input: { text },
      voice: {
        languageCode: language,
        ssmlGender: gender.toUpperCase(),
      },
      audioConfig: {
        audioEncoding: "MP3",
        pitch,
        speakingRate,
      },
    };

    const [response] = await client.synthesizeSpeech(request);
    const audioBase64 = response.audioContent.toString("base64");

    res.json({
      success: true,
      audio: `data:audio/mp3;base64,${audioBase64}`,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Voice generation failed" });
  }
});

// Chat Response Function (Optional)
exports.generateResponse = functions.https.onRequest(async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { businessId, message, sessionId, recentMessages } = req.body;

    // Get business context from Firestore
    const db = require("firebase-admin").firestore();
    const businessDoc = await db.collection("businesses").doc(businessId).get();
    
    if (!businessDoc.exists) {
      return res.status(404).json({ error: "Business not found" });
    }

    const businessData = businessDoc.data();

    // Call Gemini API with business context
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = businessData.context?.rules?.join("\n") || "You are a helpful assistant.";

    const chat = model.startChat({
      history: recentMessages.map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
    });

    const response = await chat.sendMessage(message);
    const responseText = response.response.text();

    res.json({
      success: true,
      response: responseText,
      role: "assistant",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Chat failed" });
  }
});
```

### 3. Update widget.js Config

In `client/public/widget.js`, find this section:

```javascript
(function() {
  // Around line 40
  const CONFIG = {
    backendUrl: 'https://chat-cgdxljuoea-uc.a.run.app',
    voiceBackendUrl: voiceBackendUrl,
    ...
  };
```

Replace with environment-aware config:

```javascript
(function() {
  // Detect if running on Firebase or local
  const firebaseProject = "YOUR_PROJECT_ID";
  const firebaseRegion = "us-central1";
  
  const CONFIG = {
    backendUrl: `https://${firebaseRegion}-${firebaseProject}.cloudfunctions.net/generateResponse`,
    voiceBackendUrl: `https://${firebaseRegion}-${firebaseProject}.cloudfunctions.net/generateVoice`,
    ...
  };
```

Or use environment variables:

```javascript
const CONFIG = {
  backendUrl: window.AIVoiceWidgetConfig?.backendUrl || 
              'https://us-central1-your-project.cloudfunctions.net/generateResponse',
  voiceBackendUrl: window.AIVoiceWidgetConfig?.voiceBackendUrl || 
                   'https://us-central1-your-project.cloudfunctions.net/generateVoice',
  ...
};
```

Then customers can override:

```html
<script>
  window.AIVoiceWidgetConfig = {
    businessId: "biz_xxx",
    backendUrl: "https://region-project.cloudfunctions.net/generateResponse",
    voiceBackendUrl: "https://region-project.cloudfunctions.net/generateVoice"
  };
</script>
<script src="https://your-project.web.app/widget.js"></script>
<ai-voice-widget></ai-voice-widget>
```

### 4. Deploy Everything

```bash
# Deploy Cloud Functions
firebase deploy --only functions

# Deploy widget.js to Hosting
npm run build
firebase deploy --only hosting
```

### 5. Get Your Function URLs

After deployment, Firebase shows:
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/YOUR_PROJECT
Function URL: https://us-central1-your-project.cloudfunctions.net/generateVoice
Function URL: https://us-central1-your-project.cloudfunctions.net/generateResponse
```

### 6. Update Embed Code for Customers

```html
<script>
  window.AIVoiceWidgetConfig = {
    businessId: "biz_xxx"
  };
</script>
<script src="https://your-project.web.app/widget.js"></script>
<ai-voice-widget></ai-voice-widget>
```

---

## Testing Locally Before Deploy

```bash
# Terminal 1: Start Firebase emulator
firebase emulators:start

# Terminal 2: Test widget points to emulator
# Modify widget.js to use:
# backendUrl: 'http://localhost:5001/YOUR_PROJECT/us-central1/generateResponse'
# voiceBackendUrl: 'http://localhost:5001/YOUR_PROJECT/us-central1/generateVoice'

# Open browser: http://localhost:3000 (or wherever your test page is)
# Test the widget
```

---

## Environment Variables Needed in Firebase

Set in Firebase Console → Functions → Runtime environment variables:

```
GEMINI_API_KEY=your-api-key
GOOGLE_CLOUD_PROJECT=your-project-id
```

Or in `functions/.env.local`:
```
GEMINI_API_KEY=your-api-key
```

---

## No Changes Needed in widget.js Logic

The rest of `widget.js` stays the same:
- ✅ Mic recording logic
- ✅ Waveform visualization
- ✅ Message handling
- ✅ UI rendering

Only the **API endpoint URLs** change!

---

## After This Migration

✅ Widget hosted on Firebase Hosting
✅ Voice generated by Cloud Function
✅ Chat by Cloud Function
✅ Zero Replit dependency for widget
✅ Customers get one embed code
✅ Works on any website

Your Replit server now only runs the **Admin Dashboard**:
- Create businesses
- Manage configurations
- View analytics

The **Widget is completely independent**!
