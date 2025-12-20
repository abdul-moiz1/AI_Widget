# ElevenLabs Voice Integration Guide

## Overview

VocalAI now supports ElevenLabs text-to-speech with automatic fallback to web-based voice synthesis. The system is designed to be flexible, provider-agnostic on the frontend, and maintainable.

## Core Features

- **Optional ElevenLabs Integration**: Enhance voice quality when available
- **Automatic Fallback**: Seamlessly falls back to client-side TTS if ElevenLabs is unavailable
- **Frontend-Agnostic**: Frontend never knows which TTS provider is used
- **Voice Customization**: Supports language, gender, and style preferences
- **Catalog-Based Mapping**: Human-friendly voice preferences map to technical voice IDs
- **Arabic Support**: Includes Modern Standard Arabic (MSA) voice options

## Configuration

### Environment Variables (Secrets)

Set these in your Replit secrets to enable ElevenLabs:

```
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_ENABLED=true
```

### Deployment Notes

After changing secrets, restart the application:
```bash
kill 1
```

This reloads environment variables without requiring code changes.

## Voice API Endpoints

### 1. Generate Voice Audio

**POST** `/api/voice`

Generate voice audio for assistant responses.

**Request Body:**
```json
{
  "text": "Welcome to our clinic",
  "language": "en",
  "gender": "female",
  "style": "calm"
}
```

**Response (with ElevenLabs enabled):**
- Status: 200
- Content-Type: `audio/mpeg`
- Headers:
  - `X-Voice-Provider`: `elevenlabs`
  - `X-Voice-ID`: Voice ID used
- Body: MP3 audio data

**Response (fallback mode):**
- Status: 200
- Content-Type: `application/json`
- Body:
```json
{
  "provider": "fallback",
  "voiceId": "en-US",
  "language": "en",
  "message": "Use client-side TTS with provided voiceId"
}
```

### 2. Get Available Voices

**GET** `/api/voices/:language`

Get list of available voices for a language.

**Example:** `GET /api/voices/en`

**Response:**
```json
{
  "language": "en",
  "voices": [
    {
      "id": "IZSifMMhbKnZNXE91eYx",
      "gender": "female",
      "style": "calm"
    },
    {
      "id": "EXAVITQu4vr4xnSDxMaL",
      "gender": "female",
      "style": "friendly"
    },
    {
      "id": "21m00Tcm4TlvDq8ikWAM",
      "gender": "female",
      "style": "professional"
    },
    {
      "id": "pNInz6obpgDQGcFmaJgB",
      "gender": "male",
      "style": "calm"
    },
    {
      "id": "jBpfuIE2acCO8z3wKNLl",
      "gender": "male",
      "style": "friendly"
    },
    {
      "id": "onwK4e9ZhZ51Go7IltC3",
      "gender": "male",
      "style": "professional"
    }
  ]
}
```

## Supported Voice Preferences

### Languages
- English (`en`)
- Spanish (`es`)
- Arabic (`ar`)
- French (`fr`)
- German (`de`)

### Genders
- `female`
- `male`

### Styles
- `calm`
- `friendly`
- `professional`

## Implementation Details

### Voice Preferences in Conversations

Voice preferences are stored with each conversation:

```typescript
// In database
voiceGender: varchar("voice_gender").default("female"),
voiceStyle: varchar("voice_style").default("calm"),
```

### Backend Voice Mapping

The backend maintains an internal voice catalog that maps user preferences to:
1. **ElevenLabs Voice IDs** (when enabled)
2. **Web Speech API language codes** (fallback)

This ensures users always get a voice, with graceful degradation.

### Error Handling

The system implements automatic fallback at multiple levels:

1. **Missing ElevenLabs API Key** → Use fallback
2. **API Timeout** → Use fallback
3. **Quota Exceeded** → Use fallback
4. **Unsupported Language** → Use closest match or default
5. **Network Failure** → Use fallback

## Usage Examples

### Frontend Implementation (Pseudo-code)

```javascript
// Request voice with preferences
const response = await fetch('/api/voice', {
  method: 'POST',
  body: JSON.stringify({
    text: "How can I help you today?",
    language: "en",
    gender: "female",
    style: "friendly"
  })
});

if (response.headers.get('X-Voice-Provider') === 'elevenlabs') {
  // Play ElevenLabs audio
  const audio = await response.blob();
  playAudio(audio);
} else {
  // Use Web Speech API with fallback voiceId
  const data = await response.json();
  useSpeechSynthesis(data.text, data.voiceId);
}
```

### Widget Voice Configuration

When initializing the VocalAI widget, pass voice preferences:

```javascript
VocalAI.init({
  businessId: 'your_business_id',
  language: 'ar',
  voiceGender: 'female',
  voiceStyle: 'professional'
});
```

## Voice Database

Current voice catalog includes:

### English Voices
- Female: Calm, Friendly, Professional
- Male: Calm, Friendly, Professional

### Spanish Voices
- Female: Calm, Friendly
- Male: Calm, Friendly

### Arabic Voices (Modern Standard Arabic)
- Female: Calm, Professional
- Male: Calm, Professional

### French Voices
- Female: Calm, Friendly
- Male: Calm

### German Voices
- Female: Calm
- Male: Calm

## Extending the Voice Catalog

To add new voices:

1. Get voice IDs from ElevenLabs dashboard
2. Update `voiceCatalog.elevenLabs` in `server/voice.ts`
3. Follow the naming convention: `{language}_{gender}_{style}`
4. No code restart needed for catalog updates

Example:
```typescript
export const voiceCatalog = {
  elevenLabs: {
    // ... existing voices ...
    it_female_calm: "YOUR_NEW_VOICE_ID",
    it_female_friendly: "ANOTHER_VOICE_ID",
  }
}
```

## Testing

### Test ElevenLabs Integration

```bash
curl -X POST http://localhost:5000/api/voice \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "language": "en",
    "gender": "female",
    "style": "calm"
  }'
```

### Test Fallback Mode

Unset `ELEVENLABS_ENABLED` environment variable and make the same request. Should return JSON instead of audio.

## Architecture

```
Widget Request
    ↓
/api/voice Endpoint
    ↓
generateVoice() Function
    ↓
Is ElevenLabs enabled? 
    ├─ YES → Try ElevenLabs
    │         ├─ Success? → Return MP3 audio
    │         └─ Failed? → Fall through
    │
    └─ NO → Use fallback
            └─ Return metadata
                ↓
         Frontend uses Web Speech API
```

## Performance Considerations

- ElevenLabs requests are cached by voice ID when possible
- Fallback mode has zero latency (metadata only)
- Consider adding response caching for repeated text

## Security

- ✅ API keys stored in Replit secrets (never exposed)
- ✅ No keys in frontend code
- ✅ No voice IDs in frontend
- ✅ Provider information opaque to client
