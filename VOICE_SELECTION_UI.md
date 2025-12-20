# Voice Preferences UI Component

## Usage

The `VoicePreferences` component provides a UI for selecting voice language, gender, and style.

### Import

```typescript
import { VoicePreferences, type VoiceSettings } from "@/components/voice-preferences";
```

### Basic Example

```tsx
import { useState } from "react";
import { VoicePreferences } from "@/components/voice-preferences";

export function ChatWidget() {
  const [voiceSettings, setVoiceSettings] = useState({
    language: "en",
    gender: "female",
    style: "calm",
  });

  return (
    <div>
      <VoicePreferences 
        value={voiceSettings}
        onChange={setVoiceSettings}
      />
    </div>
  );
}
```

## Features

- **Language Selection**: Choose from English, Spanish, Arabic, French, German
- **Gender Selection**: Female or Male
- **Style Selection**: Calm, Friendly, or Professional
- **Styled Cards**: Integrates with VocalAI design system
- **Accessibility**: Uses proper labels and semantic HTML
- **Test IDs**: All selectors have descriptive `data-testid` attributes

## Test IDs

For testing purposes, the component provides these test IDs:

- `select-language` - Language dropdown trigger
- `select-gender` - Gender dropdown trigger  
- `select-style` - Style dropdown trigger
- `option-language-{id}` - Specific language option (e.g., `option-language-en`)
- `option-gender-{id}` - Specific gender option (e.g., `option-gender-female`)
- `option-style-{id}` - Specific style option (e.g., `option-style-calm`)

## Integration Points

### In Widget Settings Panel

```tsx
<div className="settings-panel">
  <VoicePreferences 
    value={userVoiceSettings}
    onChange={handleVoiceChange}
  />
  <Button onClick={saveSettings}>Save Settings</Button>
</div>
```

### In Chat Interface

```tsx
<div className="chat-container">
  <div className="chat-messages">
    {/* messages */}
  </div>
  <VoicePreferences 
    value={voiceSettings}
    onChange={setVoiceSettings}
  />
  <ChatInput />
</div>
```

### Sending Preferences to Backend

```typescript
async function generateVoice(text: string, settings: VoiceSettings) {
  const response = await fetch('/api/voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      language: settings.language,
      gender: settings.gender,
      style: settings.style,
    }),
  });

  if (response.headers.get('X-Voice-Provider') === 'elevenlabs') {
    const audio = await response.blob();
    // Play audio
  } else {
    const data = await response.json();
    // Use Web Speech API with voiceId
  }
}
```

## Styling

The component uses:
- Tailwind CSS for styling
- Shadcn UI components (Select, Label, Card)
- VocalAI color scheme with white/10 backgrounds
- Responsive design (works on mobile and desktop)

## Customization

To add more voice options, update the arrays in the component:

```tsx
const languages = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "ar", label: "Arabic" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  // Add new languages here
];
```

Then ensure the backend voice catalog in `server/voice.ts` includes those languages.
