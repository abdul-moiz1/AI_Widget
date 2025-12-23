import type { Express } from "express";

/**
 * Client-facing API routes for widget management
 * These routes allow authenticated business owners to manage their widget configuration
 */
export function registerClientRoutes(app: Express) {
  // Get business ID from authenticated user
  app.get("/api/auth/business", (req, res) => {
    try {
      // In a real implementation, this would extract businessId from Firebase auth token
      // For now, this is a placeholder that would be implemented with proper auth middleware
      const businessId = req.headers["x-business-id"] as string;
      
      if (!businessId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      res.json({ businessId });
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Get widget configuration for a business
  app.get("/api/widget-config/:businessId", (req, res) => {
    try {
      const { businessId } = req.params;
      
      // Verify businessId from auth matches requested businessId
      const authBusinessId = req.headers["x-business-id"] as string;
      if (authBusinessId !== businessId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // In a real implementation, this would fetch from Firestore:
      // const doc = await db.collection("businesses").doc(businessId).get();
      // const data = doc.data();
      
      // For now, return a sample configuration
      const sampleConfig = {
        id: businessId,
        status: "active",
        widgetConfig: {
          assistantName: "Alex",
          systemPrompt: "You are a helpful and friendly AI assistant.",
          welcomeMessage: "Hello! How can I help you today?",
          voice: {
            language: "en",
            gender: "female" as const,
            style: "friendly" as const,
          },
          theme: {
            primaryColor: "#3b82f6",
            accentColor: "#06b6d4",
          },
          autoStart: false,
        },
      };

      res.json(sampleConfig);
    } catch (error) {
      console.error("Widget config fetch error:", error);
      res.status(500).json({ error: "Failed to fetch widget configuration" });
    }
  });

  // Update widget configuration for a business
  app.patch("/api/widget-config/:businessId", (req, res) => {
    try {
      const { businessId } = req.params;
      const config = req.body;

      // Verify businessId from auth matches requested businessId
      const authBusinessId = req.headers["x-business-id"] as string;
      if (authBusinessId !== businessId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // In a real implementation, this would update Firestore:
      // await db.collection("businesses").doc(businessId).update({
      //   widgetConfig: config,
      //   updatedAt: FieldValue.serverTimestamp(),
      // });

      res.json({
        success: true,
        message: "Widget configuration updated",
        businessId,
      });
    } catch (error) {
      console.error("Widget config update error:", error);
      res.status(500).json({ error: "Failed to update widget configuration" });
    }
  });
}
