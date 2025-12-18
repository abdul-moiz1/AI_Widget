/**
 * CORRECTED Firebase Cloud Functions - Deploy this to replace your current function
 * 
 * Key fixes:
 * 1. Added CORS headers to allow requests from any origin
 * 2. Handle OPTIONS preflight requests
 * 3. Improved error handling
 * 4. Fixed response format consistency
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const db = admin.firestore();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(
  functions.config().gemini.key
);

exports.chat = functions.https.onRequest(async (req, res) => {
  // CRITICAL: Enable CORS for all requests
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // Handle preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { sessionId, userMessage, persona, language } = req.body;

    // Validate input
    if (!sessionId || !userMessage) {
      return res.status(400).json({
        error: "Missing required fields: sessionId and userMessage"
      });
    }

    console.log(`Processing message for session ${sessionId}:`, userMessage);

    // Get conversation history from Firestore
    const docRef = db.collection("conversations").doc(sessionId);
    const docSnap = await docRef.get();

    let history = [];
    if (docSnap.exists) {
      history = docSnap.data().messages || [];
    }

    // Add user message to history
    history.push({
      role: "user",
      text: userMessage,
      timestamp: Date.now(),
    });

    // Create model instance
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    // Start chat with history
    const chat = model.startChat({
      history: history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      })),
    });

    // Send message and get response
    console.log("Sending to Gemini...");
    const result = await chat.sendMessage(userMessage);
    const reply = result.response.text();

    console.log("Gemini response:", reply);

    // Add assistant response to history
    history.push({
      role: "assistant",
      text: reply,
      timestamp: Date.now(),
    });

    // Save conversation to Firestore
    await docRef.set({
      messages: history,
      persona: persona || "assistant",
      language: language || "en-US",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Return response with multiple field options for compatibility
    return res.status(200).json({
      reply: reply,
      text: reply,
      response: reply,
      success: true
    });

  } catch (err) {
    console.error("Error in chat function:", err);
    const errorMessage = err.message || "Unknown error";
    
    return res.status(500).json({
      error: "Chat function failed",
      details: errorMessage,
      reply: `I encountered an error: ${errorMessage}`,
      text: `I encountered an error: ${errorMessage}`
    });
  }
});
