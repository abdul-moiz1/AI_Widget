# Complete Firebase Deployment (Widget + Voice)

Your goal: **Widget fully on Firebase with voice processing - zero Replit dependency**

## Architecture

```
Your Website (any domain)
    ↓
Loads widget.js from Firebase Hosting
    ↓
widget.js (includes voice UI)
    ↓
Calls Cloud Function for voice generation
    ↓
Returns audio → plays in browser
```

## Step 1: Deploy Widget to Firebase Hosting

```bash
# Initialize Firebase
firebase init hosting

# In firebase.json:
{
  "hosting": {
    "public": "client/public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  }
}

# Deploy
firebase deploy --only hosting
```

Your widget.js is now at:
```
https://YOUR_PROJECT.web.app/widget.js
```

## Step 2: Create Cloud Function for Voice

Create `functions/index.js`:

```javascript
const functions = require("firebase-functions");
const textToSpeech = require("@google-cloud/text-to-speech");

const client = new textToSpeech.TextToSpeechClient();

exports.generateVoice = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { text, language = "en", gender = "NEUTRAL", pitch = 1.0, speakingRate = 1.0 } = req.body;

    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    const request = {
      input: { text },
      voice: {
        languageCode: language,
        ssmlGender: gender === "female" ? "FEMALE" : gender === "male" ? "MALE" : "NEUTRAL",
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
    res.status(500).json({ error: error.message });
  }
});
```

Deploy function:
```bash
cd functions
npm install @google-cloud/text-to-speech
cd ..
firebase deploy --only functions
```

Your function is now at:
```
https://REGION-PROJECT_ID.cloudfunctions.net/generateVoice
```

## Step 3: Update widget.js to Use Cloud Function

Modify `client/public/widget.js`:

```javascript
// Instead of calling /api/voice endpoint:
const voiceBackendUrl = "https://REGION-PROJECT_ID.cloudfunctions.net/generateVoice";

// Keep the rest of widget.js the same - it still works!
```

## Step 4: Widget Embed Code for Customers

Your customers get:

```html
<script>
  window.AIVoiceWidgetConfig = {
    businessId: "biz_xxx"
  };
</script>
<script src="https://YOUR_PROJECT.web.app/widget.js"></script>
<ai-voice-widget></ai-voice-widget>
```

## Result: Complete Independence ✅

| Component | Location | Status |
|-----------|----------|--------|
| widget.js | Firebase Hosting | ✅ Independent |
| Voice generation | Cloud Function | ✅ Independent |
| Chat API | Your Replit (optional) | ✅ Can stay or move |
| Admin dashboard | Replit | ✅ Kept here |

## Can Move Chat to Firebase Too?

Yes! Create another Cloud Function:

```javascript
exports.generateResponse = functions.https.onRequest(async (req, res) => {
  // Similar CORS headers
  // Call Gemini API with business context
  // Return response
});
```

Then widget calls both:
1. `generateVoice()` - for voice
2. `generateResponse()` - for AI response

## Firebase Config in widget.js

```javascript
// At top of widget.js, replace this:
const CONFIG = {
  backendUrl: 'https://chat-cgdxljuoea-uc.a.run.app',
  voiceBackendUrl: voiceBackendUrl,
};

// With this (if using Cloud Functions):
const CONFIG = {
  backendUrl: 'https://REGION-PROJECT_ID.cloudfunctions.net/generateResponse',
  voiceBackendUrl: 'https://REGION-PROJECT_ID.cloudfunctions.net/generateVoice',
};
```

## Security Notes

1. **API Keys**: Cloud Functions have access to your Firebase project's API keys - secure by default
2. **Business Context**: Store business data in Firestore, Cloud Function retrieves it
3. **Rate Limiting**: Set Firebase quotas to prevent abuse

## Summary

✅ Widget hosted on Firebase
✅ Voice processing on Firebase Cloud Functions
✅ No Replit server dependency for widget
✅ Customers embed from Firebase only
✅ Completely serverless
