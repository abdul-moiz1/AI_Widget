/**
 * AI Voice Chat Widget - ChatGPT Voice Mode Style
 *
 * Hybrid State Model:
 * - Client-side: In-memory buffer (last 10 messages) for responsiveness
 * - Server-side: Firestore persists full conversation history by sessionId
 *
 * Usage: <script src="https://<your-domain>/widget.js"></script>
 */

const CONFIG = {
  backendUrl: "https://chat-ieskeqprjq-uc.a.run.app",
  voiceBackendUrl: "https://generatevoice-ieskeqprjq-uc.a.run.app",
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
    this.isVoiceMode = true;
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
    this.lastAIResponse = "";
    this.silenceTimeout = null;
    this.lastSpeechTime = 0;
    this.audioElement = null;
    this.speechStartTime = 0;
    this.silenceDuration = 150;
    this.minSpeechDuration = 200;
    this.minTranscriptLength = 2;

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
    this.render();
    this.setupAudio();
    this.setupSpeechRecognition();
    this.loadVoices();
  }

  async loadBusinessConfig() {
    return;
  }

  getSessionId() {
    let id = localStorage.getItem("ai-widget-session-id");
    if (!id) {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        id = crypto.randomUUID();
      } else {
        id = "sess_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
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
    console.log("📝 Buffer:", this.conversationBuffer.length, `/${this.maxBufferSize} messages`);
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
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = navigator.language || "en-US";
    this.recognition.maxAlternatives = 1;
    this.listeningActive = false;
    this.lastTranscript = "";

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
      console.log("🎤 Speech recognition ended", { isProcessing: this.isProcessing });
      this.isListening = false;
      this.stopVisualizer();
      this.updateUIState();
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

      if (this.silenceTimeout) clearTimeout(this.silenceTimeout);

      if (transcript.trim()) {
        this.lastSpeechTime = Date.now();
        this.lastTranscript = transcript;

        this.silenceTimeout = setTimeout(() => {
          if (this.listeningActive && transcript.trim()) {
            const speechDuration = Date.now() - this.speechStartTime;
            const meetsMinimumDuration = speechDuration >= this.minSpeechDuration;
            const meetsMinimumLength = transcript.trim().length >= this.minTranscriptLength;

            console.log("🎤 Silence detected, stopping listen. Duration:", speechDuration, "Valid:", meetsMinimumDuration && meetsMinimumLength);

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
        }, 100);
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
        this.addMessage("assistant", "🎤 Microphone access denied. Please allow microphone access in your browser settings.");
      } else if (event.error === "network") {
        this.addMessage("assistant", "🎤 Network error. Please check your connection and try again.");
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
          this.addMessage("assistant", "🎤 Microphone access denied. Please allow microphone access in your browser settings.");
        });

      try {
        this.listeningActive = true;
        this.recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        this.addMessage("assistant", "🎤 Speech recognition not available. Please use text input instead.");
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
    this.listeningActive = false;
    try {
      this.recognition.stop();
    } catch (e) {}

    this.isSpeaking = true;
    this.updateUIState();
    this.startVisualizer();
    this.simulateAudioData();

    try {
      const language = this.voiceSettings.language || "en";
      const gender = this.voiceSettings.voiceGender || "female";
      const style = this.voiceSettings.style || "calm";

      console.log("🎙️ Requesting voice from ElevenLabs:", { text, language, gender, style });

      const voiceUrl = CONFIG.voiceBackendUrl.startsWith('http') 
        ? CONFIG.voiceBackendUrl 
        : `${window.location.origin}${CONFIG.voiceBackendUrl}`;

      const response = await fetch(voiceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language, gender, style }),
      });

      if (!response.ok) throw new Error(`Voice API error: ${response.status}`);

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        this.fallbackSpeak(text);
        return;
      }

      const audioBlob = await response.blob();
      if (audioBlob.size === 0) throw new Error("Empty audio blob received");

      const audioUrl = URL.createObjectURL(audioBlob);

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
                this.recognition.start();
              } catch (e) {}
            }, 50);
          }
        };
      }

      this.audioElement.src = audioUrl;
      this.audioElement.volume = 1;

      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("❌ Audio play failed:", error);
          this.isSpeaking = false;
          this.stopVisualizer();
          this.isProcessing = false;
          this.updateUIState();
          this.fallbackSpeak(text);
        });
      }
    } catch (error) {
      console.error("🎙️ Eleven Labs voice error:", error);
      this.fallbackSpeak(text);
    }
  }

  fallbackSpeak(text) {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const lang = this.recognition ? this.recognition.lang : "en-US";
    const voice = this.voices.find((v) => v.lang.startsWith(lang.split("-")[0])) || this.voices[0];
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
            this.recognition.start();
          } catch (e) {}
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

    if (!this.businessId) {
      const errorMsg = "This widget is not configured correctly. Please contact the site owner.";
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

    await new Promise((r) => setTimeout(r, 500));

    try {
      const recentMessages = this.getRecentMessages();
      const payload = {
        sessionId: this.sessionId,
        message: text,
        recentMessages: recentMessages,
        businessId: this.businessId,
      };

      const res = await fetch(CONFIG.backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Backend error: ${res.status} ${res.statusText} - ${errorText}`);
      }

      const data = await res.json();
      if (data.widget) {
        if (data.widget.theme?.primaryColor) CONFIG.theme.primary = data.widget.theme.primaryColor;
        if (data.widget.voice) this.voiceSettings = { ...this.voiceSettings, ...data.widget.voice };
        if (data.widget.logoUrl) this.logoUrl = data.widget.logoUrl;
        this.render();
      }

      const responseText = data.reply || data.message || "No response received";
      this.lastAIResponse = responseText;
      this.addMessage("assistant", responseText);
      this.addToBuffer("assistant", responseText);
      this.speak(responseText);
    } catch (error) {
      console.error("API Error:", error);
      const errorMsg = "I'm having trouble connecting right now. Please try again.";
      this.addMessage("assistant", errorMsg);
      this.speak(errorMsg);
    } finally {
      this.isProcessing = false;
      this.updateUIState();
    }
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
        if (this.isVoiceMode) this.startListening();
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
    if (!this.isListening && this.recognition) this.toggleListening();
  }

  stopListeningIfActive() {
    if (this.isListening && this.recognition) this.toggleListening();
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
    if (this.isListening) micBtn.classList.add("listening");
    else micBtn.classList.remove("listening");
  }

  renderVoiceMode() {
    const langCode = this.voiceSettings.language === "en" ? "En" : this.voiceSettings.language === "es" ? "Es" : "Ar";
    const genderName = this.voiceSettings.voiceGender === "female" ? "♀" : "♂";
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
    return `
      <div class="text-mode">
        <div class="chat-header">
          <div class="header-info">
            ${this.logoUrl ? `<img src="${this.logoUrl}" class="business-logo" alt="Logo">` : ""}
            <div class="header-text">
              <div class="header-title">${this.businessName}</div>
              <div class="header-subtitle">Online</div>
            </div>
          </div>
          <button class="mode-toggle" id="mode-toggle-btn" title="Switch to Voice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          </button>
        </div>
        <div class="messages-container" id="messages-container"></div>
        <div class="input-area">
          <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off">
          <button class="text-mic-btn" id="text-mic-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          </button>
          <button class="send-btn" id="send-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    `;
  }

  render() {
    const primaryColor = CONFIG.theme.primary;
    const secondaryColor = CONFIG.theme.secondary;
    const backgroundColor = CONFIG.theme.background;
    const textColor = CONFIG.theme.text;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --primary-color: ${primaryColor};
          --secondary-color: ${secondaryColor};
          --background-color: ${backgroundColor};
          --text-color: ${textColor};
          font-family: 'Inter', system-ui, sans-serif;
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 999999;
        }
        .widget-container {
          position: fixed;
          bottom: 90px;
          right: 20px;
          width: 380px;
          height: 600px;
          max-height: calc(100vh - 120px);
          background: var(--background-color);
          border-radius: 24px;
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          transform: translateY(20px) scale(0.95);
          pointer-events: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .widget-container.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
        @media (max-width: 480px) { .widget-container { width: 100%; height: 100%; max-height: 100%; bottom: 0; right: 0; border-radius: 0; } }
        .voice-mode, .text-mode { display: flex; flex-direction: column; height: 100%; }
        .voice-header, .chat-header { padding: 16px 20px; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: space-between; position: relative; }
        .header-info { display: flex; align-items: center; gap: 12px; }
        .business-logo { width: 32px; height: 32px; border-radius: 8px; object-fit: cover; }
        .header-title { font-weight: 600; font-size: 16px; color: var(--text-color); }
        .header-subtitle { font-size: 12px; color: rgba(255, 255, 255, 0.5); }
        .voice-content { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 40px; }
        .mic-container { position: relative; width: 150px; height: 150px; display: flex; align-items: center; justify-content: center; }
        .waveform-circle { position: absolute; top: 0; left: 0; width: 150px; height: 150px; pointer-events: none; }
        .voice-mic-btn { width: 80px; height: 80px; border-radius: 50%; background: var(--primary-color); border: none; color: #000; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; box-shadow: 0 0 0 0 rgba(0, 229, 255, 0.4); z-index: 2; }
        .voice-mic-btn.listening { animation: pulse 2s infinite; background: #ff3b30; color: white; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(255, 59, 48, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0); } }
        .voice-status { color: rgba(255, 255, 255, 0.7); font-size: 14px; letter-spacing: 0.5px; }
        .voice-settings-btn { background: rgba(255, 255, 255, 0.1); border: none; color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px; cursor: pointer; margin-right: 8px; }
        .voice-settings-panel { position: absolute; top: 60px; right: 20px; background: #2d3748; border-radius: 12px; padding: 16px; width: 200px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); display: none; z-index: 100; border: 1px solid rgba(255,255,255,0.1); }
        .voice-settings-panel.open { display: block; }
        .voice-option-label { font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 8px; font-weight: 600; }
        .voice-option { display: block; width: 100%; text-align: left; background: transparent; border: none; color: white; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-bottom: 2px; }
        .voice-option:hover { background: rgba(255,255,255,0.1); }
        .voice-option.active { background: var(--primary-color); color: #000; }
        .messages-container { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
        .message { max-width: 80%; padding: 12px 16px; border-radius: 16px; font-size: 14px; line-height: 1.5; }
        .message.user { align-self: flex-end; background: var(--primary-color); color: #000; border-bottom-right-radius: 4px; }
        .message.assistant { align-self: flex-start; background: var(--secondary-color); color: #fff; border-bottom-left-radius: 4px; }
        .input-area { padding: 16px 20px; background: rgba(255, 255, 255, 0.03); display: flex; align-items: center; gap: 12px; }
        #chat-input { flex: 1; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 10px 16px; color: white; outline: none; }
        .text-mic-btn, .send-btn, .mode-toggle { background: transparent; border: none; color: rgba(255, 255, 255, 0.5); cursor: pointer; padding: 4px; transition: color 0.2s; }
        .text-mic-btn.listening { color: #ff3b30; }
        .text-mic-btn:hover, .send-btn:hover, .mode-toggle:hover { color: var(--primary-color); }
        .toggle-btn { width: 60px; height: 60px; border-radius: 50%; background: var(--primary-color); color: #000; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .toggle-btn:hover { transform: scale(1.05); }
        .toggle-btn.open { transform: rotate(90deg); }
      </style>
      <div class="widget-container" id="widget-container">
        ${this.isVoiceMode ? this.renderVoiceMode() : this.renderTextMode()}
      </div>
      <div class="toggle-btn" id="toggle-btn">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toggle-icon-closed">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
    `;

    this.shadowRoot.getElementById("toggle-btn").onclick = () => this.toggleChat();
    const modeToggle = this.shadowRoot.getElementById("mode-toggle-btn");
    if (modeToggle) modeToggle.onclick = () => this.toggleMode();

    if (this.isVoiceMode) {
      this.shadowRoot.getElementById("voice-mic-btn").onclick = () => this.toggleListening();
      const settingsBtn = this.shadowRoot.getElementById("voice-settings-btn");
      const settingsPanel = this.shadowRoot.getElementById("voice-settings-panel");
      settingsBtn.onclick = (e) => { e.stopPropagation(); settingsPanel.classList.toggle("open"); };
      this.shadowRoot.querySelectorAll(".voice-option").forEach(btn => {
        btn.onclick = () => {
          if (btn.dataset.lang) {
            this.voiceSettings.language = btn.dataset.lang;
            if (this.recognition) this.recognition.lang = btn.dataset.lang === 'en' ? 'en-US' : btn.dataset.lang === 'es' ? 'es-ES' : 'ar-SA';
          }
          if (btn.dataset.gender) this.voiceSettings.voiceGender = btn.dataset.gender;
          if (btn.dataset.style) this.voiceSettings.style = btn.dataset.style;
          settingsPanel.classList.remove("open");
          this.render();
          this.shadowRoot.querySelector(".widget-container").classList.add("open");
        };
      });
    } else {
      this.shadowRoot.getElementById("text-mic-btn").onclick = () => this.toggleListening();
      this.shadowRoot.getElementById("send-btn").onclick = () => this.handleUserMessage(this.shadowRoot.getElementById("chat-input").value);
      this.shadowRoot.getElementById("chat-input").onkeypress = (e) => { if (e.key === "Enter") this.handleUserMessage(e.target.value); };
      this.renderMessages();
    }
  }
}

customElements.define("ai-voice-widget", AIVoiceWidget);
if (!document.querySelector("ai-voice-widget")) {
  document.body.appendChild(document.createElement("ai-voice-widget"));
}
