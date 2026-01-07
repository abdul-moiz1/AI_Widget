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
  // Updated working CDN URLs for 2026
  vadUrl: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/bundle.min.js",
  onnxUrl: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.js"
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
    const scripts = [
      { id: 'ort-script', src: CONFIG.onnxUrl },
      { id: 'vad-script', src: CONFIG.vadUrl }
    ];

    scripts.forEach(s => {
      if (!document.getElementById(s.id)) {
        const script = document.createElement('script');
        script.id = s.id;
        script.src = s.src;
        script.async = true;
        document.head.appendChild(script);
      }
    });
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
      try { 
        await this.vad.start(); 
        this.isListening = true;
        this.updateUIState();
        return; 
      } catch(e) {}
    }

    try {
      if (!window.vad) {
        let attempts = 0;
        while (!window.vad && attempts < 20) {
          await new Promise(r => setTimeout(r, 500));
          attempts++;
        }
        if (!window.vad) throw new Error("VAD library timeout");
      }
      
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Initialize Speech Recognition for transcription
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.voiceSettings.language || 'en-US';

        this.recognition.onresult = (event) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          // Combined transcript for storage
          const combined = (this.finalTranscriptBase || "") + finalTranscript + interimTranscript;
          
          if (combined) {
            this.lastTranscript = combined.trim();
            console.log("LIVE TRANSCRIPT:", this.lastTranscript); // Log for debugging
            
            // Live update the UI
            const status = this.shadowRoot.getElementById("voice-status");
            if (status) {
              status.textContent = this.lastTranscript;
              status.style.opacity = interimTranscript ? "0.7" : "1";
            }
          }

          // If we got new final results, update the base
          if (finalTranscript) {
            this.finalTranscriptBase = (this.finalTranscriptBase || "") + finalTranscript;
          }
        };

        // Handle recognition errors to prevent loop hangs
        this.recognition.onerror = (event) => {
          console.error("Recognition Error:", event.error);
          if (event.error === 'not-allowed') {
            const status = this.shadowRoot.getElementById("voice-status");
            if (status) status.textContent = "Mic access denied";
          }
        };
        
        this.recognition.start();
      }

      if (!this.analyser) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      }

      this.vad = await window.vad.MicVAD.new({
        onSpeechStart: () => {
          if (this.isSpeaking) this.stopAIPlayback();
          this.isListening = true;
          this.lastTranscript = ""; 
          this.finalTranscriptBase = ""; // Reset base
          this.updateUIState();
          
          if (this.recognition) {
            try {
              this.recognition.start();
            } catch (e) {}
          }
        },
        onSpeechEnd: (audio) => {
          this.isListening = true; 
          this.updateUIState();
          
          // Wait longer for the final transcript to arrive
          // VAD usually detects end of speech faster than Speech API
          setTimeout(() => {
            // Check if we still have a very short transcript, maybe wait a bit more
            const finalWait = this.lastTranscript.length < 10 ? 1500 : 800;
            
            setTimeout(() => {
              if (this.recognition) {
                try {
                  this.recognition.stop();
                } catch (e) {}
              }
              
              // Final check before processing
              setTimeout(() => {
                this.isListening = false;
                console.log("Processing with final transcript:", this.lastTranscript);
                if (this.lastTranscript) {
                  this.processAudio(audio, this.lastTranscript);
                } else {
                  // If still empty after long wait, it's a catch failure
                  this.processAudio(audio, "");
                }
              }, 300);
            }, finalWait);
          }, 200);
        },
        onVADMisfire: () => {
          this.isListening = false;
          this.updateUIState();
          // Restart loop if it misfires and we're still in voice mode
          if (this.isOpen && this.isVoiceMode && !this.isSpeaking && !this.isProcessing) {
             this.setupVAD();
          }
        },
        onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
        baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/",
      });
      await this.vad.start();
      this.isListening = true;
      this.updateUIState();
    } catch (e) {
      console.error("VAD Setup Error:", e);
      const status = this.shadowRoot.getElementById("voice-status");
      if (status) status.textContent = "Mic access denied or error";
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

  async processAudio(audioFloat32, transcript) {
    this.isProcessing = true;
    this.updateUIState();
    
    const finalMessage = transcript?.trim() || "";

    try {
      // If we have a transcript, don't just "listen", actually process it
      const res = await fetch(CONFIG.backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          businessId: this.businessId,
          message: finalMessage, 
          recentMessages: this.conversationBuffer,
          voiceRequest: true 
        }),
      });
      const data = await res.json();
      
      const userText = finalMessage || data.transcription;
      if (userText) {
        this.messages.push({ role: "user", text: userText });
        this.conversationBuffer.push({ role: "user", text: userText });
        if (this.conversationBuffer.length > this.maxBufferSize) this.conversationBuffer.shift();
      }

      const reply = data.reply || data.message || "I'm sorry, I didn't catch that.";
      
      // If the transcript was empty or very short, and backend returned placeholder
      if ((reply === "I heard you." || !data.reply) && !finalMessage) {
        const fallbackReply = "I'm sorry, I didn't catch that.";
        this.messages.push({ role: "assistant", text: fallbackReply });
        this.renderMessages();
        await this.speak(fallbackReply);
      } else {
        this.messages.push({ role: "assistant", text: reply });
        this.conversationBuffer.push({ role: "assistant", text: reply });
        if (this.conversationBuffer.length > this.maxBufferSize) this.conversationBuffer.shift();
        
        this.renderMessages();
        await this.speak(reply);
      }
    } catch (e) {
      console.error("Processing Error:", e);
    } finally {
      this.isProcessing = false;
      this.updateUIState();
    }
  }

  async handleTextMessage(text) {
    if (!text?.trim() || this.isProcessing) return;
    
    this.messages.push({ role: "user", text });
    this.conversationBuffer.push({ role: "user", text });
    if (this.conversationBuffer.length > this.maxBufferSize) this.conversationBuffer.shift();
    
    this.isProcessing = true;
    this.renderMessages();
    this.updateUIState();

    try {
      const res = await fetch(CONFIG.backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          businessId: this.businessId,
          message: text,
          recentMessages: this.conversationBuffer
        }),
      });
      const data = await res.json();
      const reply = data.reply || data.message || "I'm sorry, I couldn't process that.";
      
      this.messages.push({ role: "assistant", text: reply });
      this.conversationBuffer.push({ role: "assistant", text: reply });
      if (this.conversationBuffer.length > this.maxBufferSize) this.conversationBuffer.shift();
      
      this.renderMessages();
      await this.speak(reply);
    } catch (e) {
      this.messages.push({ role: "assistant", text: "Connection error. Please try again." });
      this.renderMessages();
    } finally {
      this.isProcessing = false;
      this.updateUIState();
    }
  }

  async speak(text) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isSpeaking = true;
    this.updateUIState();

    // Do NOT pause VAD here to allow user interruption
    // But we need to handle the fact that VAD might trigger from AI voice
    // The browser's built-in echo cancellation usually handles this if mic and speaker are managed correctly

    try {
      const res = await fetch(CONFIG.voiceBackendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, ...this.voiceSettings }),
      });
      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      if (!this.audioElement) {
        this.audioElement = new Audio();
        this.audioElement.crossOrigin = "anonymous";
      }
      this.audioElement.src = url;
      
      if (!this.audioSource) {
        this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
        this.audioSource.connect(this.analyser || this.audioContext.destination);
        if (this.analyser) {
          this.analyser.connect(this.audioContext.destination);
        }
      }

      this.audioElement.onended = async () => {
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
      if (!this.isOpen || !this.isVoiceMode) return;
      this.animationId = requestAnimationFrame(draw);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 40;
      
      let pulse = 0;
      if (this.isProcessing) {
        pulse = Math.sin(Date.now() / 150) * 5;
      } else if (this.isListening || this.isSpeaking) {
        if (this.dataArray && this.analyser) {
          this.analyser.getByteFrequencyData(this.dataArray);
          const sum = this.dataArray.reduce((a, b) => a + b, 0);
          const avg = sum / this.dataArray.length;
          pulse = (avg / 255) * 30;
        }
      }
      
      // Draw concentric pulsing circles instead of bars
      const radius = baseRadius + pulse;
      
      // Outer glow
      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.5);
      gradient.addColorStop(0, `${CONFIG.theme.primary}44`);
      gradient.addColorStop(1, `${CONFIG.theme.primary}00`);
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Main circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.theme.primary;
      ctx.globalAlpha = 1;
      ctx.fill();
      
      // Mic icon is handled by the button overlaying this canvas
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

  async toggleChat() {
    this.isOpen = !this.isOpen;
    this.render();
    if (this.isOpen) {
      if (this.isVoiceMode) this.startVisualizer();
      else this.renderMessages();
    } else {
      if (this.vad) {
        try { await this.vad.pause(); } catch(e) {}
      }
      this.isListening = false;
      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.stopAIPlayback();
    }
  }

  toggleMode() {
    this.isVoiceMode = !this.isVoiceMode;
    if (!this.isVoiceMode) {
      if (this.vad) try { this.vad.pause(); } catch(e) {}
      this.isListening = false;
      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.stopAIPlayback();
    }
    this.render();
    if (this.isVoiceMode && this.isOpen) this.startVisualizer();
    else if (!this.isVoiceMode && this.isOpen) this.renderMessages();
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

  renderMessages() {
    const container = this.shadowRoot.getElementById("messages-container");
    if (!container) return;
    container.innerHTML = this.messages.map(m => `
      <div class="message ${m.role}">${m.text}</div>
    `).join("");
    container.scrollTop = container.scrollHeight;
  }

  renderHeader() {
    const langCode = this.voiceSettings.language.toUpperCase();
    return `
      <div class="header">
        <span class="header-title">${this.businessName}</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          <div class="settings-btn">${langCode}</div>
          <button class="mode-btn" id="mode-toggle" title="Toggle Chat Mode">
            ${this.isVoiceMode 
              ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'
              : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>'
            }
          </button>
          <button class="close-btn" id="close-btn-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
          position: fixed; bottom: 100px; right: 24px;
          width: 360px; height: 550px;
          background: #1e293b;
          border-radius: 24px;
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          opacity: 0; transform: translateY(20px); pointer-events: none;
          transition: all 0.3s ease;
        }
        .widget-container.open { opacity: 1; transform: translateY(0); pointer-events: all; }
        .header { padding: 16px 20px; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .header-title { font-weight: 700; color: #fff; font-size: 16px; }
        
        .mode-btn, .settings-btn { 
          background: rgba(255,255,255,0.08); border: none; color: white; 
          cursor: pointer; padding: 6px 10px; display: flex; border-radius: 8px;
          transition: 0.2s; font-size: 12px; font-weight: 600;
        }
        .mode-btn:hover { background: rgba(255,255,255,0.15); }

        .close-btn { background: none; border: none; color: #fff; cursor: pointer; padding: 4px; display: flex; opacity: 0.7; transition: 0.2s; }
        .close-btn:hover { opacity: 1; }
        
        .content { flex: 1; display: flex; flex-direction: column; position: relative; overflow: hidden; }
        
        .voice-view { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 40px; padding: 20px; }
        .mic-wrap { position: relative; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; }
        #waveform { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
        .voice-mic-btn { 
          width: 80px; height: 80px; border-radius: 50%; border: none; 
          background: var(--primary); color: #000; cursor: pointer; 
          display: flex; align-items: center; justify-content: center; z-index: 2;
          box-shadow: 0 0 20px rgba(0, 229, 255, 0.4);
        }
        .voice-mic-btn.listening { background: #ef4444; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
        #voice-status { font-size: 14px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

        .text-view { flex: 1; display: flex; flex-direction: column; padding: 16px; gap: 12px; overflow: hidden; }
        #messages-container { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-bottom: 10px; }
        .message { max-width: 85%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.4; }
        .message.user { align-self: flex-end; background: var(--primary); color: #000; border-bottom-right-radius: 4px; }
        .message.assistant { align-self: flex-start; background: rgba(255,255,255,0.08); color: #fff; border-bottom-left-radius: 4px; }
        
        .input-wrap { display: flex; gap: 8px; align-items: center; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 14px; }
        #chat-input { flex: 1; background: transparent; border: none; padding: 10px 12px; color: #fff; outline: none; font-size: 14px; }
        .send-btn { background: var(--primary); border: none; border-radius: 10px; width: 36px; height: 36px; color: #000; cursor: pointer; display: flex; align-items: center; justify-content: center; }

        .toggle-btn { 
          width: 60px; height: 60px; border-radius: 20px; background: var(--primary); 
          color: #000; display: flex; align-items: center; justify-content: center; 
          cursor: pointer; box-shadow: 0 10px 20px rgba(0, 229, 255, 0.3); 
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
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </div>
            </div>
          `}
        </div>
      </div>
      <div class="toggle-btn ${this.isOpen ? 'open' : ''}" id="toggle-trigger">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </div>
    `;

    this.shadowRoot.getElementById("toggle-trigger").onclick = () => this.toggleChat();
    const closeBtn = this.shadowRoot.getElementById("close-btn-header");
    if (closeBtn) closeBtn.onclick = () => this.toggleChat();
    
    const modeBtn = this.shadowRoot.getElementById("mode-toggle");
    if (modeBtn) modeBtn.onclick = () => this.toggleMode();

    if (this.isVoiceMode) {
      const micBtn = this.shadowRoot.getElementById("voice-mic-btn");
      if (micBtn) {
        micBtn.onclick = async () => {
          if (!this.vad || !this.isListening) {
            await this.setupVAD();
          } else {
            try { await this.vad.pause(); } catch(e) {}
            this.isListening = false;
            this.updateUIState();
          }
        };
      }
    } else {
      const sendBtn = this.shadowRoot.getElementById("send-btn");
      const input = this.shadowRoot.getElementById("chat-input");
      if (sendBtn) sendBtn.onclick = () => {
        this.handleTextMessage(input.value);
        input.value = "";
      };
      if (input) input.onkeydown = (e) => {
        if (e.key === "Enter") {
          this.handleTextMessage(input.value);
          input.value = "";
        }
      };
      this.renderMessages();
    }
  }
}

if (!customElements.get("ai-voice-widget")) {
  customElements.define("ai-voice-widget", AIVoiceWidget);
  document.body.appendChild(document.createElement("ai-voice-widget"));
}
