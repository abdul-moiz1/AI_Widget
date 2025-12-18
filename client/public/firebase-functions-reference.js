
// This file is a REFERENCE IMPLEMENTATION for the Firebase Cloud Function.
// It is intended to be deployed to Firebase Functions.
// Do not try to run this in the browser or Replit frontend.

/**
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Set up a Firebase project.
 * 2. Enable Cloud Functions and Firestore.
 * 3. Initialize functions locally: `firebase init functions`
 * 4. Replace `index.js` with this code.
 * 5. Set Gemini API key: `firebase functions:config:set gemini.key="YOUR_API_KEY"`
 * 6. Deploy: `firebase deploy --only functions`
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const db = admin.firestore();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(functions.config().gemini.key);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const PERSONA_PROMPTS = {
  assistant: "You are a helpful, friendly AI assistant. Be concise and natural.",
  support: "You are a customer support agent. Be empathetic, patient, and solution-oriented.",
  sales: "You are a sales representative. Be persuasive, enthusiastic, and highlight value.",
  tech: "You are a senior technical expert. Be precise, technical, and explain complex concepts clearly."
};

exports.chat = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  try {
    const { sessionId, userMessage, persona, language } = req.body;

    if (!sessionId || !userMessage) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const docRef = db.collection("conversations").doc(sessionId);
    const doc = await docRef.get();

    let history = [];
    if (doc.exists) {
      const data = doc.data();
      history = data.messages || [];
    }

    // Construct prompt with history
    const systemPrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.assistant;
    
    // Convert history to Gemini format
    const chatHistory = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `System Instruction: ${systemPrompt}. User Language: ${language}. Keep responses relatively short for voice output.` }]
        },
        {
            role: "model",
            parts: [{ text: "Understood. I will act according to the persona and constraints." }]
        },
        ...chatHistory
      ],
    });

    const result = await chat.sendMessage(userMessage);
    const responseText = result.response.text();

    // Update Firestore
    const newMessages = [
      { role: "user", text: userMessage, timestamp: new Date().toISOString() },
      { role: "assistant", text: responseText, timestamp: new Date().toISOString() }
    ];

    await docRef.set({
      persona,
      language,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      messages: admin.firestore.FieldValue.arrayUnion(...newMessages)
    }, { merge: true });

    res.json({ text: responseText });

  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
