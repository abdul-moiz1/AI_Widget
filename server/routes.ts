import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Backend storage removed - widget uses Firebase directly
  // See firebase-functions-reference.js for Cloud Function implementation
  
  return httpServer;
}
