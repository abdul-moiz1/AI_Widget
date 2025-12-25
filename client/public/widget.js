/**
 * AI Voice Chat Widget - ChatGPT Voice Mode Style
 *
 * Hybrid State Model:
 * - Client-side: In-memory buffer (last 10 messages) for responsiveness
 * - Server-side: Firestore persists full conversation history by sessionId
 *
 * Usage: <script src="https://<your-domain>/widget.js"></script>
 *
 * Features:
 * - Voice Mode by default (full-height modal with centered mic)
 * - Text Mode toggle (chat bubbles + text input)
 * - Web Speech API for real-time speech-to-text
 * - SpeechSynthesis API for AI voice responses
 * - Live waveform visualization matching voice frequency
 * - Prevents self-listening (stops mic while AI speaks)
 * - Session persistence with crypto.randomUUID() in localStorage
 * - Hybrid context: sends recentMessages + backend has full history
 * - CORS-enabled for cross-domain embedding
 * - No API keys exposed in frontend (all backend-handled)
 */

let voiceBackendUrl = "https://generatevoice-ieskeqprjq-uc.a.run.app";

const CONFIG = {
  backendUrl: "https://chat-ieskeqprjq-uc.a.run.app", // Firebase Cloud Function endpoint for chat
  voiceBackendUrl: voiceBackendUrl,
  theme: {
    primary: "#00e5ff",
    secondary: "#2d3748",
    background: "#1a202c",
    text: "#ffffff",
    userBubble: "#3182ce",
    aiBubble: "#2d3748",
  },
};

class AIVoiceWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.isOpen = false;
    this.isListening = false;
    this.isProcessing = false;
    this.isSpeaking = false;
    this.isVoiceMode = true; // Voice Mode by default
    this.sessionId = this.getSessionId();
    this.messages = [];
    this.conversationBuffer = [];
    this.maxBufferSize = 10;
    this.persona = "assistant";
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.voices = [];
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.animationId = null;
    this.lastAIResponse = ""; // Store for display in voice mode
    this.silenceTimeout = null;
    this.lastSpeechTime = 0;
    this.audioElement = null; // For playing Eleven Labs audio
    this.speechStartTime = 0;
    this.silenceDuration = 150; // 150ms of silence to stop listening (faster response)
    this.minSpeechDuration = 200; // Minimum 200ms of speech to process (filter noise)
    this.minTranscriptLength = 2; // Minimum character length to process

    // Business configuration
    this.businessId = window.AIVoiceWidgetConfig?.businessId;
    this.businessConfig = null;
    this.businessName = "AI Chat";
    this.logoUrl = null;
    this.voiceSettings = {
      language: "en",
      voiceGender: "female",
      style: "calm",
      speakingSpeed: 1,
      pitch: 1,
    };
  }

  async connectedCallback() {
    if (this.businessId) {
      await this.loadBusinessConfig();
    }
    this.render();
    this.setupAudio();
    this.setupSpeechRecognition();
    this.loadVoices();
  }

  async loadBusinessConfig() {
    try {
      // Import Firebase and load config
      const script = document.createElement("script");
      script.type = "module";
      script.textContent = `
          import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
          import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
          
          window.loadFirebaseConfig = async (projectId, apiKey, authDomain, storageBucket, messagingSenderId, appId, businessId) => {
            try {
              const app = initializeApp({
                apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
              });
              const db = getFirestore(app);
              const businessDoc = await getDoc(doc(db, 'businesses', businessId));
              return businessDoc.exists() ? { id: businessDoc.id, ...businessDoc.data() } : null;
            } catch (err) {
              console.error('Error loading business config:', err);
              return null;
            }
          };
        `;
      document.head.appendChild(script);

      // Fetch Firebase config from server
      const response = await fetch("/api/firebase-config");
      if (!response.ok) throw new Error("Failed to fetch Firebase config");
      const firebaseConfig = await response.json();

      // Wait for Firebase to be loaded, then get business config
      let maxRetries = 20;
      while (!window.loadFirebaseConfig && maxRetries-- > 0) {
        await new Promise((r) => setTimeout(r, 50));
      }

      if (window.loadFirebaseConfig) {
        const config = await window.loadFirebaseConfig(
          firebaseConfig.projectId,
          firebaseConfig.apiKey,
          firebaseConfig.authDomain,
          firebaseConfig.storageBucket,
          firebaseConfig.messagingSenderId,
          firebaseConfig.appId,
          this.businessId,
        );

        if (config) {
          this.businessConfig = config;
          this.businessName = config.businessName || "AI Chat";
          this.logoUrl = config.widget?.logoUrl;
          if (config.voice) {
            this.voiceSettings = { ...this.voiceSettings, ...config.voice };
          }
          if (config.widget?.theme?.primaryColor) {
            CONFIG.theme.primary = config.widget.theme.primaryColor;
          }
          console.log("✅ Business config loaded:", config);
        } else {
          console.error("Business not found");
        }
      }
    } catch (error) {
      console.error("Error loading business config:", error);
    }
  }

  getSessionId() {
    let id = localStorage.getItem("ai-widget-session-id");
    if (!id) {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        id = crypto.randomUUID();
      } else {
        id =
          "sess_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
      }
      localStorage.setItem("ai-widget-session-id", id);
      console.log("✅ New session created:", id);
    } else {
      console.log("✅ Existing session loaded:", id);
    }
    return id;
  }

  addToBuffer(role, text) {
    this.conversationBuffer.push({ role, text, timestamp: Date.now() });
    if (this.conversationBuffer.length > this.maxBufferSize) {
      this.conversationBuffer.shift();
    }
    console.log(
      "📝 Buffer:",
      this.conversationBuffer.length,
      `/${this.maxBufferSize} messages`,
    );
  }

  getRecentMessages() {
    return this.conversationBuffer.map((msg) => ({
      role: msg.role,
      text: msg.text,
    }));
  }

  loadVoices() {
    const populateVoices = () => {
      this.voices = this.synthesis.getVoices();
    };
    populateVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = populateVoices;
    }
  }

  setupAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  }

  setupSpeechRecognition() {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true; // Keep listening continuously
    this.recognition.interimResults = true;
    this.recognition.lang = navigator.language || "en-US";
    this.recognition.maxAlternatives = 1;
    this.listeningActive = false;
    this.lastTranscript = ""; // Track last transcript to detect silence

    this.recognition.onstart = () => {
      console.log("🎤 Speech recognition started");
      this.speechStartTime = Date.now();
      this.isListening = true;
      this.listeningActive = true;
      this.lastTranscript = "";
      this.updateUIState();
      this.startVisualizer();
    };

    this.recognition.onend = () => {
      console.log("🎤 Speech recognition ended", {
        isProcessing: this.isProcessing,
      });
      this.isListening = false;
      this.stopVisualizer();
      this.updateUIState();
      // Auto-restart if still listening
      if (this.listeningActive && !this.isProcessing) {
        try {
          this.recognition.start();
        } catch (e) {}
      }
    };

    this.recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }

      const inputEl = this.shadowRoot.getElementById("chat-input");
      if (inputEl) inputEl.value = transcript;

      // Clear existing silence timeout
      if (this.silenceTimeout) clearTimeout(this.silenceTimeout);

      // If we have speech content, set timeout to stop listening after silence
      if (transcript.trim()) {
        this.lastSpeechTime = Date.now();
        this.lastTranscript = transcript;

        // Set timeout to stop listening after short silence (100ms)
        this.silenceTimeout = setTimeout(() => {
          if (this.listeningActive && transcript.trim()) {
            // Check minimum speech duration
            const speechDuration = Date.now() - this.speechStartTime;
            const meetsMinimumDuration =
              speechDuration >= this.minSpeechDuration;
            const meetsMinimumLength =
              transcript.trim().length >= this.minTranscriptLength;

            console.log(
              "🎤 Silence detected, stopping listen. Duration:",
              speechDuration,
              "Valid:",
              meetsMinimumDuration && meetsMinimumLength,
            );

            if (meetsMinimumDuration && meetsMinimumLength) {
              this.isListening = false;
              this.stopVisualizer();
              this.isProcessing = true;
              this.listeningActive = false;
              try {
                this.recognition.stop();
              } catch (e) {}
              this.updateUIState();
              this.handleUserMessage(transcript);
            } else {
              // Noise detected, restart
              if (inputEl) inputEl.value = "";
              try {
                this.recognition.stop();
              } catch (e) {}
              setTimeout(() => {
                if (this.listeningActive) {
                  this.lastTranscript = "";
                  try {
                    this.recognition.start();
                  } catch (e) {}
                }
              }, 50);
            }
          }
        }, 100); // 100ms silence threshold
      }
    };

    this.recognition.onerror = (event) => {
      console.error("🎤 Speech recognition error:", event.error);
      if (event.error === "no-speech" || event.error === "audio-capture") {
        console.log("🎤 No speech detected, restarting...");
        if (this.listeningActive) {
          try {
            this.recognition.start();
          } catch (e) {
            console.error("Failed to restart:", e);
          }
        }
        return;
      }

      this.listeningActive = false;
      this.isListening = false;
      this.stopVisualizer();
      this.updateUIState();

      if (event.error === "not-allowed") {
        this.addMessage(
          "assistant",
          "🎤 Microphone access denied. Please allow microphone access in your browser settings.",
        );
      } else if (event.error === "network") {
        this.addMessage(
          "assistant",
          "🎤 Network error. Please check your connection and try again.",
        );
      }
    };
  }

  toggleListening() {
    if (this.isListening) {
      console.log("🎤 Stopping listening...");
      if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
      this.listeningActive = false;
      this.isListening = false;
      try {
        this.recognition.abort();
      } catch (err) {
        console.error("Error stopping recognition:", err);
      }
      this.stopVisualizer();
      this.updateUIState();
    } else {
      console.log("🎤 Starting listening...");
      if (this.audioContext && this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          console.log("🎤 Microphone access granted");
          const source = this.audioContext.createMediaStreamSource(stream);
          source.connect(this.analyser);
        })
        .catch((err) => {
          console.error("🎤 Mic access error:", err);
          this.addMessage(
            "assistant",
            "🎤 Microphone access denied. Please allow microphone access in your browser settings.",
          );
        });

      try {
        this.listeningActive = true;
        this.recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        this.addMessage(
          "assistant",
          "🎤 Speech recognition not available. Please use text input instead.",
        );
        this.listeningActive = false;
      }
    }
  }

  startVisualizer() {
    const canvas = this.shadowRoot.getElementById("waveform");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      if (!this.isListening && !this.isSpeaking) {
        ctx.clearRect(0, 0, width, height);
        return;
      }

      this.animationId = requestAnimationFrame(draw);

      if (this.analyser) {
        this.analyser.getByteFrequencyData(this.dataArray);
      } else {
        for (let i = 0; i < this.dataArray.length; i++) {
          this.dataArray[i] = Math.random() * 100;
        }
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = CONFIG.theme.primary;

      const barWidth = (width / this.dataArray.length) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < this.dataArray.length; i++) {
        barHeight = this.dataArray[i] / 2;
        ctx.fillRect(x, height / 2 - barHeight / 2, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  }

  stopVisualizer() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    const canvas = this.shadowRoot.getElementById("waveform");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  async speak(text) {
    // Stop any existing audio and listening
    this.listeningActive = false;
    try {
      this.recognition.stop();
    } catch (e) {}

    this.isSpeaking = true;
    this.updateUIState();
    this.startVisualizer();
    this.simulateAudioData();

    try {
      // Get language and voice settings
      const language = this.voiceSettings.language || "en";
      const gender = this.voiceSettings.voiceGender || "female";
      const style = this.voiceSettings.style || "calm";

      console.log("🎙️ Requesting voice from ElevenLabs:", {
        text,
        language,
        gender,
        style,
      });

      // Fetch audio from Eleven Labs via Replit backend
      const response = await fetch(`${CONFIG.voiceBackendUrl}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language,
          gender,
          style,
        }),
      });

      if (!response.ok) {
        throw new Error(`Voice API error: ${response.status}`);
      }

      // Check content-type to determine if we got audio or JSON
      const contentType = response.headers.get("content-type");
      console.log("📝 Response content-type:", contentType);

      if (contentType && contentType.includes("application/json")) {
        // Backend returned JSON (fallback response)
        const data = await response.json();
        console.log("⚠️ Backend returned fallback response:", data);
        this.fallbackSpeak(text);
        return;
      }

      // Get the audio blob (audio/mpeg or audio/*)
      const audioBlob = await response.blob();
      console.log("🎵 Audio blob size:", audioBlob.size, "bytes");

      if (audioBlob.size === 0) {
        throw new Error("Empty audio blob received");
      }

      const audioUrl = URL.createObjectURL(audioBlob);

      // Play the audio
      if (!this.audioElement) {
        this.audioElement = new Audio();
        this.audioElement.onended = () => {
          this.isSpeaking = false;
          this.stopVisualizer();
          this.isProcessing = false;
          this.updateUIState();

          if (this.isVoiceMode && this.isOpen) {
            this.listeningActive = true;
            setTimeout(() => {
              try {
                console.log("🎤 Restarting listening after speech");
                this.recognition.start();
              } catch (e) {
                console.error("Failed to restart recognition:", e);
              }
            }, 50);
          }
        };
      }

      this.audioElement.src = audioUrl;

      // Ensure audio can play with user interaction
      this.audioElement.volume = 1;

      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("✅ Audio playing from Eleven Labs");
          })
          .catch((error) => {
            console.error("❌ Audio play failed:", error);
            this.isSpeaking = false;
            this.stopVisualizer();
            this.isProcessing = false;
            this.updateUIState();
            // Fallback if audio playback fails
            this.fallbackSpeak(text);
          });
      } else {
        console.log("✅ Audio playing from Eleven Labs");
      }
    } catch (error) {
      console.error("🎙️ Eleven Labs voice error:", error);
      // Fallback to browser TTS if Eleven Labs fails
      console.log("Falling back to browser TTS...");
      this.fallbackSpeak(text);
    }
  }

  fallbackSpeak(text) {
    // Fallback to native SpeechSynthesis if Eleven Labs fails
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const lang = this.recognition ? this.recognition.lang : "en-US";
    const voice =
      this.voices.find((v) => v.lang.startsWith(lang.split("-")[0])) ||
      this.voices[0];
    if (voice) utterance.voice = voice;

    utterance.rate = this.voiceSettings.speakingSpeed || 1;
    utterance.pitch = this.voiceSettings.pitch || 1;

    utterance.onend = () => {
      this.isSpeaking = false;
      this.stopVisualizer();
      this.isProcessing = false;
      this.updateUIState();

      if (this.isVoiceMode && this.isOpen) {
        this.listeningActive = true;
        setTimeout(() => {
          try {
            console.log("🎤 Restarting listening after speech");
            this.recognition.start();
          } catch (e) {
            console.error("Failed to restart recognition:", e);
          }
        }, 50);
      }
    };

    this.synthesis.speak(utterance);
  }

  simulateAudioData() {
    if (!this.isSpeaking) return;
    const interval = setInterval(() => {
      if (!this.isSpeaking) {
        clearInterval(interval);
        return;
      }
      for (let i = 0; i < this.dataArray.length; i++) {
        this.dataArray[i] = Math.random() * 150;
      }
    }, 50);
  }

  async handleUserMessage(text) {
    if (!text.trim()) return;

    // Defensive check: ensure businessId is configured
    if (!this.businessId) {
      const errorMsg =
        "This widget is not configured correctly. Please contact the site owner.";
      this.addMessage("assistant", errorMsg);
      this.speak(errorMsg);
      return;
    }

    this.addMessage("user", text);
    this.addToBuffer("user", text);

    const inputEl = this.shadowRoot.getElementById("chat-input");
    if (inputEl) inputEl.value = "";

    this.isProcessing = true;
    this.updateUIState();

    // Ensure processing state is visible for at least 500ms
    await new Promise((r) => setTimeout(r, 500));

    try {
      let responseText;

      if (CONFIG.mockBackend) {
        await new Promise((r) => setTimeout(r, 1500));
        responseText = this.getMockResponse(text, this.persona);
      } else {
        const recentMessages = this.getRecentMessages();

        // Always include businessId in payload
        const payload = {
          sessionId: this.sessionId,
          message: text,
          recentMessages: recentMessages,
          businessId: this.businessId,
        };

        console.log("🚀 Sending to backend:", {
          sessionId: this.sessionId,
          message: text,
          businessId: this.businessId,
          backendUrl: CONFIG.backendUrl,
          bufferSize: recentMessages.length,
          recentMessages: recentMessages,
        });

        const res = await fetch(CONFIG.backendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        console.log("Backend response status:", res.status, res.statusText);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Backend error response:", errorText);
          throw new Error(
            `Backend error: ${res.status} ${res.statusText} - ${errorText}`,
          );
        }

        let data;
        try {
          data = await res.json();
          console.log("Backend response data:", data);
        } catch (jsonErr) {
          console.error("Failed to parse JSON response:", jsonErr);
          throw new Error(
            "Invalid response format from backend. Expected JSON.",
          );
        }

        responseText = data.reply || data.text || data.response || "";
        if (!responseText) {
          throw new Error(
            `No response text from backend. Response was: ${JSON.stringify(data)}`,
          );
        }
      }

      this.lastAIResponse = responseText;
      this.addMessage("assistant", responseText);
      this.addToBuffer("assistant", responseText);
      this.updateUIState();
      this.speak(responseText);
    } catch (err) {
      console.error("API Error:", err);
      const errorMsg = err.message || String(err);
      this.addMessage("assistant", `Error: ${errorMsg}`);
      this.speak("I'm having trouble connecting right now. Please try again.");
    } finally {
      this.isProcessing = false;
      this.updateUIState();
    }
  }

  getMockResponse(text, persona) {
    const responses = {
      assistant: [
        "That's an interesting perspective. Tell me more.",
        "I can certainly help you with that. Here's what I found...",
        "Based on my analysis, the optimal solution would be to...",
      ],
      support: [
        "I understand your frustration. Let me check that for you.",
        "Could you provide your order number?",
        "I'm happy to help resolve this issue immediately.",
      ],
      sales: [
        "This product is a game-changer for your workflow.",
        "We have a special offer available right now.",
        "Would you like to schedule a demo to see it in action?",
      ],
      tech: [
        "Have you tried restarting the service?",
        "The API rate limits are likely the bottleneck here.",
        "Let's look at the logs to diagnose the root cause.",
      ],
    };

    const pool = responses[persona] || responses.assistant;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  addMessage(role, text) {
    this.messages.push({ role, text, timestamp: new Date() });
    this.renderMessages();
  }

  renderMessages() {
    const container = this.shadowRoot.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = "";

    this.messages.forEach((msg) => {
      const div = document.createElement("div");
      div.className = `message ${msg.role}`;
      div.textContent = msg.text;
      container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    const widget = this.shadowRoot.querySelector(".widget-container");
    const toggleBtn = this.shadowRoot.querySelector(".toggle-btn");

    if (this.isOpen) {
      widget.classList.add("open");
      toggleBtn.classList.add("open");
      setTimeout(() => {
        if (this.isVoiceMode) {
          this.startListening();
        }
      }, 300);
    } else {
      widget.classList.remove("open");
      toggleBtn.classList.remove("open");
      this.stopListeningIfActive();
    }
  }

  toggleMode() {
    this.isVoiceMode = !this.isVoiceMode;
    this.stopListeningIfActive();
    this.messages = [];
    this.render();

    if (this.isOpen) {
      const widget = this.shadowRoot.querySelector(".widget-container");
      widget.classList.add("open");
    }
  }

  startListening() {
    if (!this.isListening && this.recognition) {
      this.toggleListening();
    }
  }

  stopListeningIfActive() {
    if (this.isListening && this.recognition) {
      this.toggleListening();
    }
  }

  updateUIState() {
    if (this.isVoiceMode) {
      this.updateVoiceModeUI();
    } else {
      this.updateTextModeUI();
    }
  }

  updateVoiceModeUI() {
    const micBtn = this.shadowRoot.getElementById("voice-mic-btn");
    const statusText = this.shadowRoot.getElementById("voice-status");

    if (!micBtn || !statusText) return;

    if (this.isListening) {
      micBtn.classList.add("listening");
      statusText.textContent = "Listening...";
    } else if (this.isProcessing) {
      micBtn.classList.remove("listening");
      statusText.textContent = "Thinking...";
    } else if (this.isSpeaking) {
      micBtn.classList.remove("listening");
      statusText.textContent = "Speaking...";
    } else {
      micBtn.classList.remove("listening");
      statusText.textContent = "Tap to speak";
    }
  }

  updateTextModeUI() {
    const micBtn = this.shadowRoot.getElementById("text-mic-btn");
    if (!micBtn) return;

    if (this.isListening) {
      micBtn.classList.add("listening");
    } else {
      micBtn.classList.remove("listening");
    }
  }

  renderVoiceMode() {
    const langCode =
      this.voiceSettings.language === "en"
        ? "En"
        : this.voiceSettings.language === "es"
          ? "Es"
          : "Ar";
    const genderName =
      this.voiceSettings.voiceGender === "female" ? "♀" : "♂";
    return `
        <div class="voice-mode">
          <div class="voice-header">
            <span class="header-title">${this.businessName}</span>
            <button class="voice-settings-btn" id="voice-settings-btn" title="Voice Settings: ${langCode} ${genderName}">${langCode} ${genderName}</button>
            <div class="voice-settings-panel" id="voice-settings-panel">
              <div class="voice-option-label">Language</div>
              <button class="voice-option ${this.voiceSettings.language === "en" ? "active" : ""}" data-lang="en">English</button>
              <button class="voice-option ${this.voiceSettings.language === "es" ? "active" : ""}" data-lang="es">Spanish</button>
              <button class="voice-option ${this.voiceSettings.language === "ar" ? "active" : ""}" data-lang="ar">Arabic</button>
              
              <div class="voice-option-label" style="margin-top: 12px;">Gender</div>
              <button class="voice-option ${this.voiceSettings.voiceGender === "female" ? "active" : ""}" data-gender="female">Female</button>
              <button class="voice-option ${this.voiceSettings.voiceGender === "male" ? "active" : ""}" data-gender="male">Male</button>

              <div class="voice-option-label" style="margin-top: 12px;">Style</div>
              <button class="voice-option ${this.voiceSettings.style === "calm" ? "active" : ""}" data-style="calm">Calm</button>
              <button class="voice-option ${this.voiceSettings.style === "friendly" ? "active" : ""}" data-style="friendly">Friendly</button>
              <button class="voice-option ${this.voiceSettings.style === "professional" ? "active" : ""}" data-style="professional">Professional</button>
            </div>
            <button class="mode-toggle" id="mode-toggle-btn" title="Switch to Messages">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </button>
          </div>

          <div class="voice-content">
            <div class="mic-container">
              <canvas id="waveform" width="150" height="150" class="waveform-circle"></canvas>
              <button class="voice-mic-btn" id="voice-mic-btn">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              </button>
            </div>

            <div class="voice-status" id="voice-status">Tap to speak</div>
          </div>
        </div>
      `;
  }

  renderTextMode() {
    const langCode =
      this.voiceSettings.language === "en"
        ? "En"
        : this.voiceSettings.language === "es"
          ? "Es"
          : "Ar";
    const genderName =
      this.voiceSettings.voiceGender === "female" ? "♀" : "♂";
    return `
        <div class="text-mode">
          <div class="text-header">
            <span class="header-title">${this.businessName}</span>
            <button class="voice-settings-btn" id="voice-settings-btn-text" title="Voice Settings: ${langCode} ${genderName}">${langCode} ${genderName}</button>
            <div class="voice-settings-panel" id="voice-settings-panel-text">
              <div class="voice-option-label">Language</div>
              <button class="voice-option ${this.voiceSettings.language === "en" ? "active" : ""}" data-lang="en">English</button>
              <button class="voice-option ${this.voiceSettings.language === "es" ? "active" : ""}" data-lang="es">Spanish</button>
              <button class="voice-option ${this.voiceSettings.language === "ar" ? "active" : ""}" data-lang="ar">Arabic</button>
              
              <div class="voice-option-label" style="margin-top: 12px;">Gender</div>
              <button class="voice-option ${this.voiceSettings.voiceGender === "female" ? "active" : ""}" data-gender="female">Female</button>
              <button class="voice-option ${this.voiceSettings.voiceGender === "male" ? "active" : ""}" data-gender="male">Male</button>

              <div class="voice-option-label" style="margin-top: 12px;">Style</div>
              <button class="voice-option ${this.voiceSettings.style === "calm" ? "active" : ""}" data-style="calm">Calm</button>
              <button class="voice-option ${this.voiceSettings.style === "friendly" ? "active" : ""}" data-style="friendly">Friendly</button>
              <button class="voice-option ${this.voiceSettings.style === "professional" ? "active" : ""}" data-style="professional">Professional</button>
            </div>
            <button class="mode-toggle" id="mode-toggle-btn" title="Switch to Voice Mode">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path></svg>
            </button>
          </div>
          
          <div class="messages-area" id="messages-container">
            <div class="message assistant">Hi! I'm your AI assistant. You can speak or type.</div>
          </div>

          <div class="text-controls">
            <div class="input-row">
              <input type="text" id="chat-input" placeholder="Type or use the mic..." />
              <button class="text-mic-btn" id="text-mic-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              </button>
              <button class="send-btn" id="send-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </div>
        </div>
      `;
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    const widget = this.shadowRoot.querySelector(".widget-container");
    const toggleBtn = this.shadowRoot.querySelector(".toggle-btn");

    if (this.isOpen) {
      widget.classList.add("open");
      toggleBtn.classList.add("open");
      setTimeout(() => {
        if (this.isVoiceMode && !this.isListening) {
          this.startListening();
        } else if (!this.isVoiceMode) {
          const input = this.shadowRoot.getElementById("chat-input");
          if (input) input.focus();
        }
      }, 300);
    } else {
      widget.classList.remove("open");
      toggleBtn.classList.remove("open");
      this.stopListeningIfActive();
    }
  }

  render() {
    const styles = `
        :host {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          --primary: ${CONFIG.theme.primary};
          --bg: ${CONFIG.theme.background};
          --surface: ${CONFIG.theme.secondary};
          --text: ${CONFIG.theme.text};
        }

        * { box-sizing: border-box; }

        .widget-wrapper {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 16px;
          font-family: inherit;
        }

        .toggle-btn {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), #0099cc);
          border: 2px solid rgba(0,229,255,0.3);
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(0,229,255,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
        }

        .toggle-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 12px 32px rgba(0,229,255,0.5);
        }
        
        .toggle-btn svg {
          width: 35px;
          height: 35px;
          color: #000;
          transition: all 0.3s;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }
        
        .toggle-btn .close-icon { display: none; }
        .toggle-btn.open .chat-icon { display: none; }
        .toggle-btn.open .close-icon { display: block; }

        .widget-container {
          width: 420px;
          height: 700px;
          max-height: calc(100vh - 100px);
          background: linear-gradient(135deg, #0a1628 0%, #1a2942 100%);
          border-radius: 28px;
          box-shadow: 0 20px 60px rgba(0,229,255,0.2), 0 0 40px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          transform: translateY(20px) scale(0.95);
          transform-origin: bottom right;
          pointer-events: none;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          border: 1px solid rgba(0,229,255,0.2);
          backdrop-filter: blur(10px);
        }

        .widget-container.open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: all;
        }

        /* Voice Mode Styles */
        .voice-mode {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: linear-gradient(180deg, rgba(10,22,40,0.8), rgba(26,41,66,0.8));
        }

        .voice-header {
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(0,229,255,0.1);
        }

        .voice-settings-btn {
          background: rgba(0,229,255,0.08);
          border: 1px solid rgba(0,229,255,0.2);
          color: var(--primary);
          cursor: pointer;
          padding: 8px 14px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          min-width: fit-content;
          height: 36px;
        }

        .voice-settings-btn:hover {
          background: rgba(0,229,255,0.15);
          box-shadow: 0 0 12px rgba(0,229,255,0.2);
        }

        .header-title {
          font-weight: 600;
          color: var(--text);
          font-size: 16px;
          flex: 1;
          background: linear-gradient(135deg, var(--primary), #0099cc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .voice-settings-panel {
          position: absolute;
          top: 60px;
          right: 16px;
          background: linear-gradient(135deg, rgba(10,22,40,0.95), rgba(26,41,66,0.95));
          border: 1px solid rgba(0,229,255,0.2);
          border-radius: 12px;
          padding: 12px;
          z-index: 99999;
          min-width: 180px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          display: none;
          pointer-events: auto;
        }

        .voice-settings-panel.open {
          display: block;
        }

        .voice-option {
          background: rgba(0,229,255,0.08);
          border: 1px solid rgba(0,229,255,0.15);
          color: var(--text);
          padding: 8px 12px;
          margin: 4px 0;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
          pointer-events: auto;
        }

        .voice-option:hover {
          background: rgba(0,229,255,0.15);
          border-color: rgba(0,229,255,0.3);
        }

        .voice-option.active {
          background: rgba(0,229,255,0.3);
          border-color: rgba(0,229,255,0.5);
          color: var(--primary);
        }

        .voice-option-label {
          font-size: 11px;
          color: rgba(255,255,255,0.6);
          margin-top: 8px;
          margin-bottom: 4px;
        }

        .mode-toggle {
          background: rgba(0,229,255,0.08);
          border: 1px solid rgba(0,229,255,0.2);
          color: var(--primary);
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 32px;
          width: 32px;
        }

        .mode-toggle:hover {
          background: rgba(0,229,255,0.15);
          box-shadow: 0 0 12px rgba(0,229,255,0.2);
        }

        .voice-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 32px;
          padding: 40px 24px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .mic-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 180px;
          height: 180px;
        }

        .waveform-circle {
          position: absolute;
          width: 180px;
          height: 180px;
          opacity: 0.8;
        }

        .voice-mic-btn {
          position: relative;
          z-index: 2;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(0,229,255,0.15), rgba(0,150,200,0.1));
          border: 2px solid rgba(0,229,255,0.3);
          color: var(--primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          box-shadow: 0 8px 24px rgba(0,229,255,0.15);
        }

        .voice-mic-btn:hover {
          background: linear-gradient(135deg, rgba(0,229,255,0.25), rgba(0,150,200,0.15));
          box-shadow: 0 12px 32px rgba(0,229,255,0.25);
          transform: scale(1.05);
        }

        .voice-mic-btn.listening {
          background: linear-gradient(135deg, #ef4444, #ff6b6b);
          border-color: rgba(239,68,68,0.5);
          animation: micPulse 1.2s ease-in-out infinite;
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
        }

        @keyframes micPulse {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 15px rgba(239, 68, 68, 0);
          }
        }

        .voice-status {
          font-size: 14px;
          color: rgba(0,229,255,0.7);
          text-align: center;
          font-weight: 500;
          letter-spacing: 0.5px;
          animation: fadeIn 0.3s ease-in;
        }

        /* Text Mode Styles */
        .text-mode {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .text-header {
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(0,229,255,0.1);
        }

        .text-logo {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          object-fit: contain;
        }

        .voice-logo {
          width: 40px;
          height: 40px;
          border-radius: 4px;
          object-fit: contain;
        }

        .text-title {
          font-weight: 600;
          color: var(--text);
          font-size: 16px;
          background: linear-gradient(135deg, var(--primary), #0099cc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          flex: 1;
        }

        .voice-indicator {
          font-size: 12px;
          padding: 4px 8px;
          background: rgba(0, 229, 255, 0.15);
          border: 1px solid rgba(0, 229, 255, 0.3);
          border-radius: 4px;
          color: var(--primary);
          font-weight: 500;
          white-space: nowrap;
        }

        .voice-indicator-btn {
          font-size: 12px;
          padding: 4px 8px;
          background: rgba(0, 229, 255, 0.15);
          border: 1px solid rgba(0, 229, 255, 0.3);
          border-radius: 4px;
          color: var(--primary);
          font-weight: 500;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .voice-indicator-btn:hover {
          background: rgba(0, 229, 255, 0.25);
          border-color: rgba(0, 229, 255, 0.5);
          box-shadow: 0 0 8px rgba(0, 229, 255, 0.2);
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scrollbar-width: thin;
          scrollbar-color: rgba(0,229,255,0.2) transparent;
          background: linear-gradient(180deg, transparent, rgba(0,100,150,0.03));
        }

        .message {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.6;
          word-wrap: break-word;
          animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0; 
            transform: translateY(10px) scale(0.95);
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1);
          }
        }

        .message.user {
          align-self: flex-end;
          background: linear-gradient(135deg, #0099ff, #00ccff);
          color: #000;
          font-weight: 500;
          border-bottom-right-radius: 4px;
        }

        .message.assistant {
          align-self: flex-start;
          background: linear-gradient(135deg, #1a4d5c, #0d3a47);
          color: rgba(255,255,255,0.95);
          border: 1px solid rgba(0,229,255,0.2);
          border-bottom-left-radius: 4px;
        }

        .text-controls {
          padding: 14px;
          background: linear-gradient(180deg, rgba(0,50,100,0.05), rgba(0,0,0,0.15));
          border-top: 1px solid rgba(0,229,255,0.1);
        }

        .input-row {
          display: flex;
          gap: 8px;
        }

        input {
          flex: 1;
          background: rgba(0,229,255,0.08);
          border: 1.5px solid rgba(0,229,255,0.2);
          border-radius: 24px;
          padding: 10px 16px;
          color: white;
          outline: none;
          font-size: 14px;
          transition: all 0.3s;
        }

        input::placeholder {
          color: rgba(255,255,255,0.4);
        }

        input:focus {
          border-color: var(--primary);
          background: rgba(0,229,255,0.15);
          box-shadow: 0 0 12px rgba(0,229,255,0.2);
        }

        .text-mic-btn, .send-btn {
          background: rgba(0,229,255,0.1);
          border: 1px solid rgba(0,229,255,0.2);
          color: var(--primary);
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
          height: 40px;
        }

        .text-mic-btn:hover, .send-btn:hover {
          background: rgba(0,229,255,0.2);
          box-shadow: 0 0 12px rgba(0,229,255,0.3);
        }

        .text-mic-btn.listening {
          background: linear-gradient(135deg, #ef4444, #ff6b6b);
          border-color: rgba(239,68,68,0.5);
          color: white;
        }
      `;

    this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        <div class="widget-wrapper">
          <div class="widget-container">
            ${this.isVoiceMode ? this.renderVoiceMode() : this.renderTextMode()}
          </div>

          <button class="toggle-btn">
            <svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;

    // Event Listeners
    this.shadowRoot
      .querySelector(".toggle-btn")
      .addEventListener("click", () => this.toggleChat());
    // Voice Settings Panel Listeners (Voice Mode)
    const settingsBtn = this.shadowRoot.getElementById("voice-settings-btn");
    const settingsPanel = this.shadowRoot.getElementById(
      "voice-settings-panel",
    );

    // Voice Settings Panel Listeners (Text Mode)
    const settingsBtnText = this.shadowRoot.getElementById(
      "voice-settings-btn-text",
    );
    const settingsPanelText = this.shadowRoot.getElementById(
      "voice-settings-panel-text",
    );

    // Use either panel depending on which one exists
    const activeSettingsBtn = settingsBtn || settingsBtnText;
    const activeSettingsPanel = settingsPanel || settingsPanelText;

    if (activeSettingsBtn && activeSettingsPanel) {
      activeSettingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        activeSettingsPanel.classList.toggle("open");
      });

      this.shadowRoot.querySelectorAll("[data-lang]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.voiceSettings.language = e.target.getAttribute("data-lang");
          this.shadowRoot
            .querySelectorAll("[data-lang]")
            .forEach((b) => b.classList.remove("active"));
          e.target.classList.add("active");
          console.log(
            "🎤 Voice language changed to:",
            this.voiceSettings.language,
          );
        });
      });

      this.shadowRoot.querySelectorAll("[data-gender]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.voiceSettings.voiceGender = e.target.getAttribute("data-gender");
          this.shadowRoot
            .querySelectorAll("[data-gender]")
            .forEach((b) => b.classList.remove("active"));
          e.target.classList.add("active");
          console.log(
            "🎤 Voice gender changed to:",
            this.voiceSettings.voiceGender,
          );
        });
      });

      this.shadowRoot.querySelectorAll("[data-style]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.voiceSettings.style = e.target.getAttribute("data-style");
          this.shadowRoot
            .querySelectorAll("[data-style]")
            .forEach((b) => b.classList.remove("active"));
          e.target.classList.add("active");
          console.log("🎤 Voice style changed to:", this.voiceSettings.style);
        });
      });

      // Close panel when clicking outside (but not on buttons inside it)
      this.shadowRoot.addEventListener("click", (e) => {
        if (
          !e.target.closest(".voice-settings-panel") &&
          !e.target.closest(".voice-settings-btn")
        ) {
          activeSettingsPanel.classList.remove("open");
        }
      });
    }

    const modeToggle = this.shadowRoot.getElementById("mode-toggle-btn");
    if (modeToggle) {
      modeToggle.addEventListener("click", () => this.toggleMode());
    }

    if (this.isVoiceMode) {
      const voiceMicBtn = this.shadowRoot.getElementById("voice-mic-btn");
      if (voiceMicBtn) {
        voiceMicBtn.addEventListener("click", () => this.toggleListening());
      }
    } else {
      const textMicBtn = this.shadowRoot.getElementById("text-mic-btn");
      const input = this.shadowRoot.getElementById("chat-input");
      const sendBtn = this.shadowRoot.getElementById("send-btn");

      if (textMicBtn) {
        textMicBtn.addEventListener("click", () => this.toggleListening());
      }

      if (input && sendBtn) {
        const handleSend = () => {
          const text = input.value;
          if (text) this.handleUserMessage(text);
        };

        sendBtn.addEventListener("click", handleSend);
        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter") handleSend();
        });
      }
    }
  }
}

customElements.define("ai-voice-widget", AIVoiceWidget);

// Auto-inject into body
const widget = document.createElement("ai-voice-widget");
document.body.appendChild(widget);
