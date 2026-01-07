/**
 * AI Voice Chat Widget - ChatGPT Voice Mode Style
 */

const CONFIG = {
  backendUrl: "https://chat-ieskeqprjq-uc.a.run.app",
  voiceBackendUrl: "https://generatevoice-ieskeqprjq-uc.a.run.app",
  theme: {
    primary: "#00e5ff",
    secondary: "#2d3748",
    background: "#1a202c",
    text: "#ffffff",
  },
  vadUrl: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.19/dist/bundle.js",
  onnxUrl: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/ort.js"
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
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.animationId = null;
    this.audioElement = null;
    this.vad = null;
    this.businessId = window.AIVoiceWidgetConfig?.businessId;
    this.businessName = "AI Voice Assistant";
    this.voiceSettings = {
      language: "en",
      voiceGender: "female",
      style: "friendly",
    };
    this.loadScripts();
  }

  loadScripts() {
    if (!window.ort) {
      const script = document.createElement('script');
      script.src = CONFIG.onnxUrl;
      document.head.appendChild(script);
    }
    const vadScript = document.createElement('script');
    vadScript.src = CONFIG.vadUrl;
    document.head.appendChild(vadScript);
  }

  async connectedCallback() {
    this.render();
  }

  getSessionId() {
    let id = localStorage.getItem("ai-widget-session-id");
    if (!id) {
      id = crypto.randomUUID?.() || "sess_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("ai-widget-session-id", id);
    }
    return id;
  }

  async setupVAD() {
    if (this.vad) {
      try { await this.vad.start(); return; } catch(e) {}
    }
    try {
      if (!window.vad) {
        console.error("VAD library not loaded yet");
        return;
      }
      
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      }

      this.vad = await window.vad.MicVAD.new({
        onSpeechStart: () => {
          if (this.isSpeaking) this.stopAIPlayback();
          this.isListening = true;
          this.updateUIState();
        },
        onSpeechEnd: (audio) => {
          this.isListening = false;
          this.updateUIState();
          this.processAudio(audio);
        },
        onVADMisfire: () => {
          this.isListening = false;
          this.updateUIState();
        }
      });
      await this.vad.start();
    } catch (e) {
      console.error("VAD Setup Error:", e);
    }
  }

  stopAIPlayback() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.isSpeaking = false;
    this.updateUIState();
  }

  async processAudio(audioFloat32) {
    this.isProcessing = true;
    this.updateUIState();
    try {
      const res = await fetch(CONFIG.backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          businessId: this.businessId,
          recentMessages: this.conversationBuffer
        }),
      });
      const data = await res.json();
      const reply = data.reply || "I'm listening.";
      this.conversationBuffer.push({ role: "assistant", text: reply });
      await this.speak(reply);
    } catch (e) {
      console.error("Processing Error:", e);
    } finally {
      this.isProcessing = false;
      this.updateUIState();
    }
  }

  async speak(text) {
    this.isSpeaking = true;
    this.updateUIState();
    try {
      const res = await fetch(CONFIG.voiceBackendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, ...this.voiceSettings }),
      });
      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      if (!this.audioElement) this.audioElement = new Audio();
      this.audioElement.src = url;
      
      if (!this.audioSource) {
        this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
        this.audioSource.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      }

      this.audioElement.onended = () => {
        this.isSpeaking = false;
        this.updateUIState();
      };
      await this.audioElement.play();
    } catch (e) {
      console.error("Speech Error:", e);
      this.isSpeaking = false;
      this.updateUIState();
    }
  }

  startVisualizer() {
    const canvas = this.shadowRoot.getElementById("waveform");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const draw = () => {
      if (!this.isOpen) return;
      this.animationId = requestAnimationFrame(draw);
      
      const bars = 5;
      const barWidth = 6;
      const gap = 4;
      const totalWidth = (barWidth + gap) * bars - gap;
      let startX = (canvas.width - totalWidth) / 2;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = CONFIG.theme.primary;
      
      for (let i = 0; i < bars; i++) {
        let height = 4;
        if (this.isProcessing) {
          height = 8 + Math.sin(Date.now() / 150 + i) * 4;
          ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 200) * 0.2;
        } else if (this.isListening || this.isSpeaking) {
          this.analyser?.getByteFrequencyData(this.dataArray);
          const value = this.dataArray[i * 2] || 0;
          height = (value / 5) + 4;
          ctx.globalAlpha = 1;
        } else {
          height = 4;
          ctx.globalAlpha = 0.3;
        }
        
        const y = (canvas.height - height) / 2;
        this.roundRect(ctx, startX, y, barWidth, height, barWidth / 2);
        ctx.fill();
        startX += barWidth + gap;
      }
    };
    draw();
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    this.render();
    if (this.isOpen) {
      this.setupVAD();
      this.startVisualizer();
    } else {
      if (this.vad) this.vad.pause();
      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.stopAIPlayback();
    }
  }

  updateUIState() {
    const status = this.shadowRoot.getElementById("voice-status");
    if (status) {
      if (this.isProcessing) status.textContent = "Thinking...";
      else if (this.isSpeaking) status.textContent = "Speaking...";
      else if (this.isListening) status.textContent = "Listening...";
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
          </div>
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
          position: fixed; bottom: 24px; right: 24px; z-index: 9999;
          font-family: 'Inter', system-ui, sans-serif;
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
        .header { padding: 16px 20px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; }
        .header-title { font-weight: 700; color: #fff; font-size: 15px; }
        .settings-btn { 
          background: rgba(255,255,255,0.08); border: none; color: white; 
          cursor: pointer; padding: 8px; border-radius: 10px; font-size: 12px; font-weight: 600;
        }
        .content { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32px; }
        .mic-wrap { position: relative; width: 160px; height: 160px; display: flex; align-items: center; justify-content: center; }
        #waveform { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.8; }
        .voice-mic-btn { 
          width: 80px; height: 80px; border-radius: 50%; border: none; 
          background: var(--primary); color: #000; cursor: pointer; 
          display: flex; align-items: center; justify-content: center; z-index: 2;
        }
        .voice-mic-btn.listening { background: #ff4b4b; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255,75,75,0.4); } 70% { box-shadow: 0 0 0 20px rgba(255,75,75,0); } 100% { box-shadow: 0 0 0 0 rgba(255,75,75,0); } }
        #voice-status { font-size: 13px; color: rgba(255,255,255,0.6); font-weight: 500; text-transform: uppercase; }
        .toggle-btn { 
          width: 56px; height: 56px; border-radius: 18px; background: var(--primary); 
          color: #000; display: flex; align-items: center; justify-content: center; 
          cursor: pointer; box-shadow: 0 10px 20px rgba(0, 229, 255, 0.2); 
        }
        .toggle-btn.open { display: none; }
      </style>
      <div class="widget-container ${this.isOpen ? 'open' : ''}">
        ${this.renderHeader()}
        <div class="content">
          <div class="mic-wrap">
            <canvas id="waveform" width="140" height="140"></canvas>
            <button class="voice-mic-btn" id="voice-mic-btn">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            </button>
          </div>
          <div id="voice-status">Tap to speak</div>
        </div>
      </div>
      <div class="toggle-btn ${this.isOpen ? 'open' : ''}" id="toggle-trigger">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </div>
    `;

    this.shadowRoot.getElementById("toggle-trigger").onclick = () => this.toggleChat();
    const closeBtn = this.shadowRoot.getElementById("close-btn-header");
    if (closeBtn) closeBtn.onclick = () => this.toggleChat();
  }
}

if (!customElements.get("ai-voice-widget")) {
  customElements.define("ai-voice-widget", AIVoiceWidget);
  document.body.appendChild(document.createElement("ai-voice-widget"));
}

if (!customElements.get("ai-voice-widget")) {
  customElements.define("ai-voice-widget", AIVoiceWidget);
  document.body.appendChild(document.createElement("ai-voice-widget"));
}

if (!customElements.get("ai-voice-widget")) {
  customElements.define("ai-voice-widget", AIVoiceWidget);
  document.body.appendChild(document.createElement("ai-voice-widget"));
}
