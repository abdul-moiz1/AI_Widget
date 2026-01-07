/**
 * AI Voice Chat Widget - ChatGPT Voice Mode Style
 *
 * Hybrid State Model:
 * - Client-side: In-memory buffer (last 10 messages) for responsiveness
 * - Server-side: Firestore persists full conversation history by sessionId
 */

const CONFIG = {
  backendUrl: "https://chat-ieskeqprjq-uc.a.run.app",
  voiceBackendUrl: "https://generatevoice-ieskeqprjq-uc.a.run.app",
  theme: {
    primary: "#00e5ff",
    secondary: "#2d3748",
    background: "#1a202c",
    text: "#ffffff",
    userBubble: "#00e5ff",
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
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.voices = [];
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.animationId = null;
    this.audioElement = null;
    this.businessId = window.AIVoiceWidgetConfig?.businessId;
    this.businessName = "AI Voice Assistant";
    this.logoUrl = null;
    this.voiceSettings = {
      language: "en",
      voiceGender: "female",
      style: "friendly",
      speakingSpeed: 1,
    };
  }

  async connectedCallback() {
    this.render();
    this.setupAudio();
    this.setupSpeechRecognition();
    this.loadVoices();
  }

  getSessionId() {
    let id = localStorage.getItem("ai-widget-session-id");
    if (!id) {
      id = crypto.randomUUID?.() || "sess_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("ai-widget-session-id", id);
    }
    return id;
  }

  addToBuffer(role, text) {
    this.conversationBuffer.push({ role, text, timestamp: Date.now() });
    if (this.conversationBuffer.length > this.maxBufferSize) this.conversationBuffer.shift();
  }

  loadVoices() {
    const populate = () => { this.voices = this.synthesis.getVoices(); };
    populate();
    if (this.synthesis.onvoiceschanged !== undefined) this.synthesis.onvoiceschanged = populate;
  }

  setupAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (e) { console.error("Audio API error", e); }
  }

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateUIState();
      this.startVisualizer();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.stopVisualizer();
      this.updateUIState();
      if (this.isOpen && this.isVoiceMode && !this.isProcessing && !this.isSpeaking) {
        try { this.recognition.start(); } catch (e) {}
      }
    };

    this.recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) {
        this.handleUserMessage(transcript);
      }
    };
  }

  toggleListening() {
    if (this.isListening) {
      this.isListening = false;
      try { this.recognition.stop(); } catch (e) {}
    } else {
      if (this.audioContext?.state === "suspended") this.audioContext.resume();
      try { this.recognition.start(); } catch (e) {}
    }
  }

  startVisualizer() {
    const canvas = this.shadowRoot.getElementById("waveform");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const draw = () => {
      if (!this.isListening && !this.isSpeaking) return;
      this.animationId = requestAnimationFrame(draw);
      this.analyser?.getByteFrequencyData(this.dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = CONFIG.theme.primary;
      const barWidth = (canvas.width / this.dataArray.length) * 2.5;
      let x = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        const barHeight = this.dataArray[i] / 2;
        ctx.fillRect(x, canvas.height / 2 - barHeight / 2, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  }

  stopVisualizer() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    const canvas = this.shadowRoot.getElementById("waveform");
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  async speak(text) {
    try { this.recognition.stop(); } catch (e) {}
    this.isSpeaking = true;
    this.updateUIState();
    this.startVisualizer();

    try {
      const res = await fetch(CONFIG.voiceBackendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, ...this.voiceSettings }),
      });
      if (!res.ok) throw new Error("Voice API error");
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      if (!this.audioElement) this.audioElement = new Audio();
      this.audioElement.src = audioUrl;
      this.audioElement.onended = () => {
        this.isSpeaking = false;
        this.stopVisualizer();
        this.updateUIState();
        if (this.isOpen && this.isVoiceMode) this.toggleListening();
      };
      await this.audioElement.play();
    } catch (e) {
      this.fallbackSpeak(text);
    }
  }

  fallbackSpeak(text) {
    this.synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      this.isSpeaking = false;
      this.stopVisualizer();
      this.updateUIState();
      if (this.isOpen && this.isVoiceMode) this.toggleListening();
    };
    this.synthesis.speak(utterance);
  }

  async handleUserMessage(text) {
    if (!text.trim() || this.isProcessing) return;
    this.addMessage("user", text);
    this.addToBuffer("user", text);
    this.isProcessing = true;
    this.updateUIState();

    try {
      const res = await fetch(CONFIG.backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          message: text,
          businessId: this.businessId,
          recentMessages: this.conversationBuffer.map(m => ({ role: m.role, text: m.text }))
        }),
      });
      const data = await res.json();
      if (data.widget?.theme?.primaryColor) CONFIG.theme.primary = data.widget.theme.primaryColor;
      const reply = data.reply || data.message || "I'm sorry, I couldn't process that.";
      this.addMessage("assistant", reply);
      this.addToBuffer("assistant", reply);
      this.speak(reply);
    } catch (e) {
      this.addMessage("assistant", "Connection error. Please try again.");
    } finally {
      this.isProcessing = false;
      this.updateUIState();
    }
  }

  addMessage(role, text) {
    this.messages.push({ role, text });
    if (!this.isVoiceMode) this.renderMessages();
  }

  renderMessages() {
    const container = this.shadowRoot.getElementById("messages-container");
    if (!container) return;
    container.innerHTML = this.messages.map(m => `
      <div class="message ${m.role}">${m.text}</div>
    `).join("");
    container.scrollTop = container.scrollHeight;
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    this.render();
    if (this.isOpen && this.isVoiceMode) this.toggleListening();
    else this.isListening = false;
  }

  toggleMode() {
    this.isVoiceMode = !this.isVoiceMode;
    if (this.isListening) try { this.recognition.stop(); } catch (e) {}
    this.render();
  }

  updateUIState() {
    const status = this.shadowRoot.getElementById("voice-status");
    if (status) {
      if (this.isListening) status.textContent = "Listening...";
      else if (this.isProcessing) status.textContent = "Thinking...";
      else if (this.isSpeaking) status.textContent = "Speaking...";
      else status.textContent = "Tap to speak";
    }
    const mic = this.shadowRoot.getElementById("voice-mic-btn");
    if (mic) mic.classList.toggle("listening", this.isListening);
  }

  renderHeader() {
    const langCode = this.voiceSettings.language === "en" ? "En" : this.voiceSettings.language === "es" ? "Es" : "Ar";
    return `
      <div class="header">
        <span class="header-title">${this.businessName}</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="settings-btn" id="settings-btn" title="Voice Settings">${langCode}</button>
          <div class="settings-panel" id="settings-panel">
            <div class="option-label">Language</div>
            <div class="option-grid">
              <button class="option ${this.voiceSettings.language === 'en' ? 'active' : ''}" data-lang="en">EN</button>
              <button class="option ${this.voiceSettings.language === 'es' ? 'active' : ''}" data-lang="es">ES</button>
              <button class="option ${this.voiceSettings.language === 'ar' ? 'active' : ''}" data-lang="ar">AR</button>
            </div>
            <div class="option-label" style="margin-top:12px">Gender</div>
            <div class="option-grid">
              <button class="option ${this.voiceSettings.voiceGender === 'female' ? 'active' : ''}" data-gender="female">♀</button>
              <button class="option ${this.voiceSettings.voiceGender === 'male' ? 'active' : ''}" data-gender="male">♂</button>
            </div>
            <div class="option-label" style="margin-top:12px">Style</div>
            <div class="option-grid">
              <button class="option ${this.voiceSettings.style === 'friendly' ? 'active' : ''}" data-style="friendly">☺</button>
              <button class="option ${this.voiceSettings.style === 'professional' ? 'active' : ''}" data-style="professional">👔</button>
            </div>
          </div>
          <button class="mode-btn" id="mode-toggle">
            ${this.isVoiceMode 
              ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'
              : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>'
            }
          </button>
          <button class="mode-btn mobile-only" id="close-btn-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
    `;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --primary: ${CONFIG.theme.primary};
          --bg: #1a202c;
          --text: #ffffff;
          position: fixed; bottom: 24px; right: 24px; z-index: 9999;
          font-family: 'Inter', system-ui, sans-serif;
        }
        @media (max-width: 480px) {
          :host {
            bottom: ${this.isOpen ? '0' : '24px'};
            right: ${this.isOpen ? '0' : '24px'};
            width: ${this.isOpen ? '100vw' : 'auto'};
            height: ${this.isOpen ? '100vh' : 'auto'};
          }
        }
        .widget-container {
          position: fixed; bottom: 90px; right: 24px;
          width: 380px; height: 600px; max-height: calc(100vh - 120px);
          background: rgba(26, 32, 44, 0.9);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-radius: 24px;
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255,255,255,0.1);
          opacity: 0; transform: translateY(20px) scale(0.98); pointer-events: none;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .widget-container.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }

        @media (max-width: 480px) {
          .widget-container { width: 100%; height: 100%; max-height: 100%; bottom: 0; right: 0; border-radius: 0; background: var(--bg); }
        }

        .header { padding: 16px 20px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; }
        .header-title { font-weight: 700; color: var(--text); font-size: 15px; letter-spacing: -0.01em; }
        
        .mode-btn, .settings-btn { 
          background: rgba(255,255,255,0.08); border: none; color: white; 
          cursor: pointer; padding: 8px; display: flex; border-radius: 10px;
          transition: 0.2s;
        }
        .settings-btn { font-size: 12px; font-weight: 600; min-width: 36px; justify-content: center; }
        .mode-btn:hover, .settings-btn:hover { background: rgba(255,255,255,0.15); }
        .mobile-only { display: none; }
        @media (max-width: 480px) { .mobile-only { display: flex; } }

        .content { flex: 1; display: flex; flex-direction: column; position: relative; overflow: hidden; }
        .voice-view { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32px; }
        .mic-wrap { position: relative; width: 160px; height: 160px; display: flex; align-items: center; justify-content: center; }
        #waveform { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.6; }
        .voice-mic-btn { 
          width: 80px; height: 80px; border-radius: 50%; border: none; 
          background: var(--primary); color: #000; cursor: pointer; 
          display: flex; align-items: center; justify-content: center; z-index: 2;
          box-shadow: 0 0 20px rgba(0, 229, 255, 0.3);
        }
        .voice-mic-btn.listening { background: #ff4b4b; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255,75,75,0.4); } 70% { box-shadow: 0 0 0 20px rgba(255,75,75,0); } 100% { box-shadow: 0 0 0 0 rgba(255,75,75,0); } }
        #voice-status { font-size: 13px; color: rgba(255,255,255,0.6); font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; }

        .settings-panel { 
          position: absolute; top: 60px; right: 20px; background: #2d3748; 
          border-radius: 16px; padding: 12px; width: 140px; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.3); display: none; z-index: 100; 
          border: 1px solid rgba(255,255,255,0.1); 
        }
        .settings-panel.open { display: block; }
        .option-label { font-size: 10px; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 6px; font-weight: 700; }
        .option-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(30px, 1fr)); gap: 4px; margin-bottom: 4px; }
        .option { background: rgba(255,255,255,0.05); border: none; color: white; padding: 6px; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: 600; transition: 0.2s; }
        .option.active { background: var(--primary); color: #000; }

        .text-view { flex: 1; display: flex; flex-direction: column; padding: 16px; gap: 12px; overflow: hidden; }
        #messages-container { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-bottom: 10px; }
        .message { max-width: 80%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.4; }
        .message.user { align-self: flex-end; background: var(--primary); color: #000; border-bottom-right-radius: 4px; }
        .message.assistant { align-self: flex-start; background: rgba(255,255,255,0.08); color: #fff; border-bottom-left-radius: 4px; }

        .input-wrap { display: flex; gap: 8px; align-items: center; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 14px; }
        #chat-input { flex: 1; background: transparent; border: none; padding: 10px 12px; color: #fff; outline: none; font-size: 14px; }
        .send-btn { background: var(--primary); border: none; border-radius: 10px; width: 36px; height: 36px; color: #000; cursor: pointer; display: flex; align-items: center; justify-content: center; }

        .toggle-btn { 
          width: 56px; height: 56px; border-radius: 18px; background: var(--primary); 
          color: #000; display: flex; align-items: center; justify-content: center; 
          cursor: pointer; box-shadow: 0 10px 20px rgba(0, 229, 255, 0.2); 
          transition: 0.3s;
        }
        .toggle-btn.open { display: none; }
      </style>
      <div class="widget-container ${this.isOpen ? 'open' : ''}">
        ${this.renderHeader()}
        <div class="content">
          ${this.isVoiceMode ? `
            <div class="voice-view">
              <div class="mic-wrap">
                <canvas id="waveform" width="140" height="140"></canvas>
                <button class="voice-mic-btn" id="voice-mic-btn">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                </button>
              </div>
              <div id="voice-status">Tap to speak</div>
            </div>
          ` : `
            <div class="text-view">
              <div id="messages-container"></div>
              <div class="input-wrap">
                <input type="text" id="chat-input" placeholder="Message..." autocomplete="off">
                <button class="send-btn" id="send-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </div>
            </div>
          `}
        </div>
      </div>
      <div class="toggle-btn ${this.isOpen ? 'open' : ''}" id="toggle-trigger">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </div>
    `;

    this.shadowRoot.getElementById("toggle-trigger").onclick = () => this.toggleChat();
    this.shadowRoot.getElementById("mode-toggle").onclick = () => this.toggleMode();
    const closeBtn = this.shadowRoot.getElementById("close-btn-header");
    if (closeBtn) closeBtn.onclick = () => this.toggleChat();

    const settingsBtn = this.shadowRoot.getElementById("settings-btn");
    const settingsPanel = this.shadowRoot.getElementById("settings-panel");
    if (settingsBtn) {
      settingsBtn.onclick = (e) => { e.stopPropagation(); settingsPanel.classList.toggle("open"); };
    }
    
    this.shadowRoot.querySelectorAll(".option").forEach(btn => {
      btn.onclick = () => {
        if (btn.dataset.lang) this.voiceSettings.language = btn.dataset.lang;
        if (btn.dataset.gender) this.voiceSettings.voiceGender = btn.dataset.gender;
        if (btn.dataset.style) this.voiceSettings.style = btn.dataset.style;
        this.render();
      };
    });

    if (this.isVoiceMode) {
      const micBtn = this.shadowRoot.getElementById("voice-mic-btn");
      if (micBtn) micBtn.onclick = () => this.toggleListening();
    } else {
      const sendBtn = this.shadowRoot.getElementById("send-btn");
      const input = this.shadowRoot.getElementById("chat-input");
      if (sendBtn) sendBtn.onclick = () => this.handleUserMessage(input.value);
      if (input) input.onkeypress = (e) => { if (e.key === "Enter") { this.handleUserMessage(input.value); input.value = ''; } };
      this.renderMessages();
    }
  }
}

if (!customElements.get("ai-voice-widget")) {
  customElements.define("ai-voice-widget", AIVoiceWidget);
  document.body.appendChild(document.createElement("ai-voice-widget"));
}
