import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Chat endpoint for AI Voice Widget
  app.post("/api/chat", async (req, res) => {
    try {
      const { sessionId, message, recentMessages = [], persona = "assistant", language = "en" } = req.body;

      if (!sessionId || !message) {
        return res.status(400).json({ error: "Missing required fields: sessionId and message" });
      }

      // Get full conversation history from storage
      let fullHistory = [];
      const existingConversation = await storage.getConversation(sessionId);
      if (existingConversation) {
        fullHistory = Array.isArray(existingConversation.messages) ? existingConversation.messages : [];
      }

      // Use full history from storage (this is the source of truth)
      const history = fullHistory.length > 0 ? fullHistory : recentMessages;

      // Build context from history for the AI
      const contextMessages = history.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`).join('\n');
      
      // Simple mock AI response (in production, would call Gemini API here)
      const systemPrompts: Record<string, string> = {
        assistant: "You are a helpful, friendly AI assistant. Be concise and natural.",
        support: "You are a customer support agent. Be empathetic, patient, and solution-oriented.",
        sales: "You are a sales representative. Be persuasive, enthusiastic, and highlight value.",
        tech: "You are a senior technical expert. Be precise, technical, and explain complex concepts clearly."
      };

      const systemPrompt = systemPrompts[persona] || systemPrompts.assistant;
      
      // Mock response that considers the conversation history
      let responseText = "I understand.";
      
      // Check if user asked about their name and if it's in history
      if (message.toLowerCase().includes("name")) {
        const nameMatch = history.find((msg: any) => 
          msg.text.toLowerCase().includes("my name is") || 
          msg.text.toLowerCase().includes("i'm") ||
          msg.text.toLowerCase().includes("im")
        );
        if (nameMatch && nameMatch.role === 'user') {
          const textMatch = nameMatch.text.match(/(?:my name is|i'm|im)\s+(\w+)/i);
          if (textMatch) {
            responseText = `Your name is ${textMatch[1]}!`;
          }
        }
      }

      // Save user message and AI response to storage
      const newMessages = [
        { role: "user" as const, text: message, timestamp: new Date().toISOString() },
        { role: "assistant" as const, text: responseText, timestamp: new Date().toISOString() }
      ];

      await storage.appendMessages(sessionId, newMessages);

      return res.json({
        reply: responseText,
        sessionId,
        messageCount: fullHistory.length + 2
      });
    } catch (err) {
      console.error("Chat error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}
