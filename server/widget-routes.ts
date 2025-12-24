import type { Express } from "express";
import { generateWidgetEmbedScript } from "./widget-deployment";

/**
 * Widget distribution routes
 * These endpoints help distribute your widget code to clients
 */
export function registerWidgetRoutes(app: Express) {
  /**
   * GET /api/widget/embed
   * Generate the embed script for a specific business
   * 
   * Query params:
   *   - businessId: The business ID
   *   - firebaseUrl: (optional) URL to Firebase-hosted widget (defaults to Replit domain)
   */
  app.get("/api/widget/embed", (req, res) => {
    try {
      const { businessId, firebaseUrl } = req.query;

      if (!businessId || typeof businessId !== "string") {
        return res.status(400).json({ error: "businessId is required" });
      }

      // Determine widget URL
      let widgetUrl = firebaseUrl as string;
      
      if (!widgetUrl) {
        // Default to Replit domain if Firebase URL not provided
        const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
        const host = req.get("host") || "localhost:5000";
        widgetUrl = `${protocol}://${host}/widget.js`;
      }

      // Get voice backend URL
      const voiceBackendUrl =
        process.env.VOICE_BACKEND_URL ||
        `${req.protocol}://${req.get("host")}/api/voice`;

      // Generate embed script
      const embedCode = generateWidgetEmbedScript({
        businessId,
        widgetUrl,
        voiceBackendUrl,
      });

      res.setHeader("Content-Type", "text/html");
      res.send(embedCode);
    } catch (error) {
      console.error("Widget embed generation error:", error);
      res.status(500).json({ error: "Failed to generate embed script" });
    }
  });

  /**
   * GET /api/widget/code/:businessId
   * Get JavaScript code to embed in other websites
   * Returns a script tag that can be copied and pasted
   */
  app.get("/api/widget/code/:businessId", (req, res) => {
    try {
      const { businessId } = req.params;

      // Determine widget URL
      const firebaseUrl = process.env.FIREBASE_WIDGET_URL;
      let widgetUrl: string;

      if (firebaseUrl) {
        // Use Firebase URL if configured
        widgetUrl = firebaseUrl;
      } else {
        // Fall back to Replit domain
        const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
        const host = req.get("host") || "localhost:5000";
        widgetUrl = `${protocol}://${host}/widget.js`;
      }

      // Build the complete embed code
      const embedCode = `<!-- Copy and paste this code into your website -->
<script>
  window.AIVoiceWidgetConfig = {
    businessId: "${businessId}",
  };
</script>
<script src="${widgetUrl}"></script>
<ai-voice-widget></ai-voice-widget>`;

      res.json({
        businessId,
        embedCode,
        widgetUrl,
        instructions:
          "Copy the embedCode above and paste it into your HTML <body> tag",
      });
    } catch (error) {
      console.error("Widget code generation error:", error);
      res.status(500).json({ error: "Failed to generate widget code" });
    }
  });

  /**
   * GET /widget.js (Fallback)
   * Serves widget.js from filesystem if not using Firebase
   * This is handled by Express static middleware in server/index.ts
   */

  /**
   * POST /api/widget/deploy-status
   * Check if widget is deployed to Firebase
   */
  app.post("/api/widget/deploy-status", (req, res) => {
    try {
      const firebaseUrl = process.env.FIREBASE_WIDGET_URL;

      if (!firebaseUrl) {
        return res.json({
          deployed: false,
          message: "Widget not deployed to Firebase. Using local serving.",
          currentUrl:
            `${req.protocol}://${req.get("host")}/widget.js`,
        });
      }

      // In production, you could verify the URL is accessible
      res.json({
        deployed: true,
        firebaseUrl,
        message: "Widget deployed to Firebase Hosting",
      });
    } catch (error) {
      console.error("Deploy status check error:", error);
      res.status(500).json({ error: "Failed to check deploy status" });
    }
  });
}
