import type { Express } from "express";
import { createServer, type Server } from "http";

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

  // Backend storage removed - widget uses Firebase directly
  // See firebase-functions-reference.js for Cloud Function implementation
  
  return httpServer;
}
