import type { Express } from "express";
import { createServer, type Server } from "http";
import { generateVoice, getAvailableVoices, type VoiceRequest } from "./voice";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Firebase configuration endpoint for admin dashboard
  app.get("/api/firebase-config", (_req, res) => {
    res.json({
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    });
  });

  // Widget message endpoint - proxy to Cloud Function with businessId
  app.post("/api/chat", async (req, res) => {
    try {
      const { businessId, message, sessionId, recentMessages } = req.body;

      if (!businessId) {
        return res.status(400).json({ error: "businessId is required" });
      }

      const cloudFunctionUrl = 'https://chat-cgdxljuoea-uc.a.run.app';
      
      const response = await fetch(cloudFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          message,
          sessionId,
          recentMessages
        })
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  // Voice generation endpoint
  app.post("/api/voice", async (req, res) => {
    try {
      const { text, language, gender, style } = req.body;

      if (!text) {
        return res.status(400).json({ error: "text is required" });
      }

      const voiceRequest: VoiceRequest = {
        text,
        language: language || "en",
        gender: gender || "female",
        style: style || "calm",
      };

      const result = await generateVoice(voiceRequest);

      // If audio is available (ElevenLabs), send as binary
      if (result.audio) {
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("X-Voice-Provider", result.provider);
        res.setHeader("X-Voice-ID", result.voiceId);
        res.send(result.audio);
      } else {
        // Otherwise return fallback voice metadata for client-side TTS
        res.json({
          provider: result.provider,
          voiceId: result.voiceId,
          language: result.language,
          message: "Use client-side TTS with provided voiceId",
        });
      }
    } catch (error) {
      console.error("Voice generation error:", error);
      res.status(500).json({ error: "Failed to generate voice" });
    }
  });

  // Get available voices endpoint
  app.get("/api/voices/:language", (req, res) => {
    try {
      const { language } = req.params;
      const voices = getAvailableVoices(language);
      res.json(voices);
    } catch (error) {
      console.error("Get voices error:", error);
      res.status(500).json({ error: "Failed to get voices" });
    }
  });

  // Backend storage removed - widget uses Firebase directly
  // See firebase-functions-reference.js for Cloud Function implementation
  
  return httpServer;
}
