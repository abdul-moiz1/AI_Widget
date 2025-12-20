// Using built-in fetch available in Node.js 18+

export interface VoicePreferences {
  language: string;
  gender: string;
  style: string;
}

export interface VoiceRequest {
  text: string;
  language?: string;
  gender?: string;
  style?: string;
}

// Voice mapping catalog - maps user preferences to voice providers
// Using standard Eleven Labs voice IDs available in all accounts
const voiceCatalog = {
  elevenLabs: {
    // English voices - using default Eleven Labs voices
    en_female_calm: "21m00Tcm4TlvDq8ikWAM",      // Rachel
    en_female_friendly: "EXAVITQu4vr4xnSDxMaL",  // Bella
    en_female_professional: "EXAVITQu4vr4xnSDxMaL", // Bella (reuse)
    en_male_calm: "pNInz6obpgDQGcFmaJgB",        // Adam
    en_male_friendly: "jBpfuIE2acCO8z3wKNLl",    // Charlie
    en_male_professional: "pNInz6obpgDQGcFmaJgB", // Adam (reuse)

    // Spanish voices - using available standard voices
    es_female_calm: "VR6AewLBeTwWjF0xOr0m",
    es_female_friendly: "VR6AewLBeTwWjF0xOr0m",
    es_male_calm: "pNInz6obpgDQGcFmaJgB",
    es_male_friendly: "jBpfuIE2acCO8z3wKNLl",

    // Arabic voices - using available standard voices
    ar_female_calm: "EXAVITQu4vr4xnSDxMaL",
    ar_female_professional: "EXAVITQu4vr4xnSDxMaL",
    ar_male_calm: "pNInz6obpgDQGcFmaJgB",
    ar_male_professional: "pNInz6obpgDQGcFmaJgB",

    // French voices - using available standard voices
    fr_female_calm: "VR6AewLBeTwWjF0xOr0m",
    fr_female_friendly: "EXAVITQu4vr4xnSDxMaL",
    fr_male_calm: "pNInz6obpgDQGcFmaJgB",

    // German voices - using available standard voices
    de_female_calm: "EXAVITQu4vr4xnSDxMaL",
    de_male_calm: "pNInz6obpgDQGcFmaJgB",
  },

  fallback: {
    // Default voices for fallback system
    en: "en-US",
    es: "es-ES",
    ar: "ar",
    fr: "fr-FR",
    de: "de-DE",
  },
};

// Normalize language codes to standard format
function normalizeLanguage(lang: string): string {
  const mapping: Record<string, string> = {
    english: "en",
    spanish: "es",
    arabic: "ar",
    french: "fr",
    german: "de",
  };

  const normalized = lang.toLowerCase();
  return mapping[normalized] || normalized.split("-")[0];
}

// Normalize gender to lowercase
function normalizeGender(gender: string): string {
  return gender.toLowerCase();
}

// Normalize style to lowercase
function normalizeStyle(style: string): string {
  const styleMap: Record<string, string> = {
    calm: "calm",
    friendly: "friendly",
    professional: "professional",
    neutral: "calm",
    default: "calm",
  };

  const normalized = style.toLowerCase();
  return styleMap[normalized] || "calm";
}

// Build voice key from preferences
function buildVoiceKey(
  language: string,
  gender: string,
  style: string
): string {
  const lang = normalizeLanguage(language);
  const g = normalizeGender(gender);
  const s = normalizeStyle(style);

  return `${lang}_${g}_${s}`;
}

// Get ElevenLabs voice ID, with fallback to closest match
function getElevenLabsVoiceId(
  language: string,
  gender: string,
  style: string
): string | null {
  const catalog = voiceCatalog.elevenLabs as Record<string, string>;
  const key = buildVoiceKey(language, gender, style);

  if (catalog[key]) {
    return catalog[key];
  }

  // Fallback: try other styles for same language/gender
  const lang = normalizeLanguage(language);
  const g = normalizeGender(gender);

  const fallbackKey = Object.keys(catalog).find((k) => {
    const [kLang, kGender] = k.split("_");
    return kLang === lang && kGender === g;
  });

  if (fallbackKey) {
    return catalog[fallbackKey];
  }

  // Fallback: try other genders for same language
  const langOnlyKey = Object.keys(catalog).find((k) =>
    k.startsWith(lang + "_")
  );

  return langOnlyKey ? catalog[langOnlyKey] : null;
}

// Get fallback voice ID
function getFallbackVoiceId(language: string): string {
  const catalog = voiceCatalog.fallback as Record<string, string>;
  const lang = normalizeLanguage(language);

  return catalog[lang] || "en-US";
}

// Attempt to generate voice with ElevenLabs
async function generateWithElevenLabs(
  text: string,
  voiceId: string
): Promise<Buffer | null> {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;

  if (!apiKey) {
    console.warn("ElevenLabs API key not found in environment variables");
    return null;
  }

  console.log(`Calling ElevenLabs for voiceId: ${voiceId}, text length: ${text.length}`);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    console.log(`ElevenLabs response status: ${response.status}`);

    if (!response.ok) {
      console.warn(
        `ElevenLabs API error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.warn("ElevenLabs request failed:", error);
    return null;
  }
}

// Generate voice using fallback system (Web Speech API indicator)
function getFallbackVoiceResponse(
  language: string,
  gender: string,
  style: string
): { voiceId: string; provider: "fallback" } {
  return {
    voiceId: getFallbackVoiceId(language),
    provider: "fallback",
  };
}

// Main voice generation function
export async function generateVoice(request: VoiceRequest): Promise<{
  audio: Buffer | null;
  provider: "elevenlabs" | "fallback";
  voiceId: string;
  language: string;
}> {
  const language = request.language || "en";
  const gender = request.gender || "female";
  const style = request.style || "calm";

  const isElevenLabsEnabled =
    process.env.ELEVENLABS_ENABLED === "true" &&
    process.env.ELEVEN_LABS_API_KEY;

  // If ElevenLabs is enabled, attempt to use it
  if (isElevenLabsEnabled) {
    const voiceId = getElevenLabsVoiceId(language, gender, style);

    if (voiceId) {
      const audio = await generateWithElevenLabs(request.text, voiceId);

      if (audio) {
        return {
          audio,
          provider: "elevenlabs",
          voiceId,
          language,
        };
      }

      console.log(
        "ElevenLabs generation failed, falling back to default voice"
      );
    }
  }

  // Fallback: return metadata for client-side TTS
  const fallbackVoice = getFallbackVoiceResponse(language, gender, style);

  return {
    audio: null,
    provider: "fallback",
    voiceId: fallbackVoice.voiceId,
    language,
  };
}

// Get available voices for a language
export function getAvailableVoices(language: string): {
  language: string;
  voices: Array<{
    id: string;
    gender: string;
    style: string;
  }>;
} {
  const lang = normalizeLanguage(language);
  const catalog = voiceCatalog.elevenLabs as Record<string, string>;

  const voices = Object.keys(catalog)
    .filter((key) => key.startsWith(lang + "_"))
    .map((key) => {
      const parts = key.split("_");
      return {
        id: catalog[key],
        gender: parts[1],
        style: parts[2],
      };
    });

  return {
    language: lang,
    voices,
  };
}
