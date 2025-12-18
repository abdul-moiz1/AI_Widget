/**
 * AI Voice Chat Widget
 * 
 * Usage: <script src="widget.js"></script>
 * 
 * Features:
 * - Floating UI with Shadow DOM
 * - Web Speech API (Input)
 * - Speech Synthesis API (Output)
 * - Real-time Audio Visualization
 * - Persona Selection
 * - Session Management
 */

(function() {
  const CONFIG = {
    backendUrl: 'https://chat-cgdxljuoea-uc.a.run.app', // Firebase Cloud Function endpoint
    mockBackend: false, // Set to false when backend is ready
    theme: {
      primary: '#00e5ff',
      secondary: '#2d3748',
      background: '#1a202c',
      text: '#ffffff',
      userBubble: '#3182ce',
      aiBubble: '#2d3748'
    }
  };

  class AIVoiceWidget extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.isOpen = false;
      this.isListening = false;
      this.isProcessing = false;
      this.isSpeaking = false;
      this.sessionId = this.getSessionId();
      this.messages = [];
      this.persona = 'assistant';
      this.recognition = null;
      this.synthesis = window.speechSynthesis;
      this.voices = [];
      this.audioContext = null;
      this.analyser = null;
      this.dataArray = null;
      this.animationId = null;
    }

    connectedCallback() {
      this.render();
      this.setupAudio();
      this.setupSpeechRecognition();
      this.loadVoices();
      
      // Auto-open for demo purposes after a short delay
      setTimeout(() => {
        // this.toggleChat(); 
      }, 1000);
    }

    getSessionId() {
      let id = sessionStorage.getItem('ai-widget-session');
      if (!id) {
        id = 'sess_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('ai-widget-session', id);
      }
      return id;
    }

    loadVoices() {
      // Voices are loaded asynchronously
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
        console.error('Web Audio API not supported', e);
      }
    }

    setupSpeechRecognition() {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech Recognition API not supported in this browser.');
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = navigator.language || 'en-US';
      this.recognition.maxAlternatives = 1;
      this.listeningActive = false;

      this.recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        this.isListening = true;
        this.listeningActive = true;
        this.updateUIState();
        this.startVisualizer();
      };

      this.recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        // Auto-restart if still supposed to be listening
        if (this.listeningActive) {
          console.log('🎤 Restarting recognition...');
          setTimeout(() => {
            try {
              this.recognition.start();
            } catch (e) {
              console.error('Failed to restart:', e);
            }
          }, 100);
        } else {
          this.isListening = false;
          this.stopVisualizer();
          this.updateUIState();
        }
      };

      this.recognition.onresult = (event) => {
        console.log('🎤 Result received', { isFinal: event.results[event.results.length - 1].isFinal });
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }

        console.log('🎤 Transcript:', transcript);

        const inputEl = this.shadowRoot.getElementById('chat-input');
        if (inputEl) inputEl.value = transcript;

        if (event.results[event.results.length - 1].isFinal && transcript.trim()) {
          this.listeningActive = false;
          this.handleUserMessage(transcript);
        }
      };

      this.recognition.onerror = (event) => {
        console.error('🎤 Speech recognition error:', event.error);
        
        // Ignore temporary errors, just keep listening
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          console.log('🎤 Temporary error, continuing to listen...');
          return;
        }
        
        this.listeningActive = false;
        this.isListening = false;
        this.stopVisualizer();
        this.updateUIState();
        
        // Show user-friendly error messages
        if (event.error === 'not-allowed') {
          this.addMessage('assistant', '🎤 Microphone access denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'network') {
          this.addMessage('assistant', '🎤 Network error. Please check your connection and try again.');
        }
      };
    }

    toggleListening() {
      if (this.isListening) {
        this.recognition.stop();
      } else {
        // Resume AudioContext if suspended (browser policy)
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
        
        try {
          this.recognition.start();
        } catch (err) {
          console.error('Failed to start speech recognition:', err);
          this.addMessage('assistant', '🎤 Speech recognition not available. Please use text input instead.');
        }
      }
    }

    startVisualizer() {
      const canvas = this.shadowRoot.getElementById('waveform');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
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
            // Fallback noise if analyser fails
            for(let i=0; i<this.dataArray.length; i++) {
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
          
          // Mirror effect
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
      const canvas = this.shadowRoot.getElementById('waveform');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    speak(text) {
      if (this.synthesis.speaking) {
        this.synthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Select voice based on detected language or default
      // Simple heuristic: match 'en' or user's lang
      const lang = this.recognition ? this.recognition.lang : 'en-US';
      const voice = this.voices.find(v => v.lang.startsWith(lang.split('-')[0])) || this.voices[0];
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.updateUIState();
        this.startVisualizer();
        // Simulate audio data for visualizer during speech (since we can't easily capture synthesis output)
        this.simulateAudioData();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.stopVisualizer();
        this.updateUIState();
      };

      this.synthesis.speak(utterance);
    }
    
    simulateAudioData() {
        // Mock data for visualizer when AI speaks
        if (!this.isSpeaking) return;
        const interval = setInterval(() => {
            if (!this.isSpeaking) {
                clearInterval(interval);
                return;
            }
            // Fill dataArray with random noise to simulate speech waveform
            for (let i = 0; i < this.dataArray.length; i++) {
                 this.dataArray[i] = Math.random() * 150;
            }
        }, 50);
    }

    async handleUserMessage(text) {
      if (!text.trim()) return;

      // Add user message
      this.addMessage('user', text);
      
      // Clear input
      const inputEl = this.shadowRoot.getElementById('chat-input');
      if (inputEl) inputEl.value = '';

      // Set loading
      this.isProcessing = true;
      this.updateUIState();

      try {
        let responseText;

        if (CONFIG.mockBackend) {
          // Mock delay
          await new Promise(r => setTimeout(r, 1500));
          responseText = this.getMockResponse(text, this.persona);
        } else {
          console.log('Sending to backend:', CONFIG.backendUrl, { sessionId: this.sessionId, userMessage: text, persona: this.persona });
          
          const payload = {
            sessionId: this.sessionId,
            message: text
          };
          
          console.log('Payload:', payload);
          
          const res = await fetch(CONFIG.backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          console.log('Backend response status:', res.status, res.statusText);
          
          if (!res.ok) {
            const errorText = await res.text();
            console.error('Backend error response:', errorText);
            throw new Error(`Backend error: ${res.status} ${res.statusText} - ${errorText}`);
          }
          
          const data = await res.json();
          console.log('Backend response data:', data);
          
          responseText = data.reply || data.text || data.response || '';
          if (!responseText) {
            throw new Error(`No response text from backend. Response was: ${JSON.stringify(data)}`);
          }
        }

        this.addMessage('assistant', responseText);
        this.speak(responseText);

      } catch (err) {
        console.error('API Error:', err);
        const errorMsg = err.message || String(err);
        this.addMessage('assistant', `❌ Error: ${errorMsg}`);
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
          "Based on my analysis, the optimal solution would be to..."
        ],
        support: [
          "I understand your frustration. Let me check that for you.",
          "Could you provide your order number?",
          "I'm happy to help resolve this issue immediately."
        ],
        sales: [
          "This product is a game-changer for your workflow.",
          "We have a special offer available right now.",
          "Would you like to schedule a demo to see it in action?"
        ],
        tech: [
          "Have you tried restarting the service?",
          "The API rate limits are likely the bottleneck here.",
          "Let's look at the logs to diagnose the root cause."
        ]
      };
      
      const pool = responses[persona] || responses.assistant;
      return pool[Math.floor(Math.random() * pool.length)] + " (Mock Response)";
    }

    addMessage(role, text) {
      this.messages.push({ role, text, timestamp: new Date() });
      this.renderMessages();
    }

    renderMessages() {
      const container = this.shadowRoot.getElementById('messages-container');
      if (!container) return;

      container.innerHTML = '';
      
      this.messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `message ${msg.role}`;
        div.textContent = msg.text;
        container.appendChild(div);
      });

      // Scroll to bottom
      container.scrollTop = container.scrollHeight;
    }

    toggleChat() {
      this.isOpen = !this.isOpen;
      const widget = this.shadowRoot.querySelector('.widget-container');
      const toggleBtn = this.shadowRoot.querySelector('.toggle-btn');
      
      if (this.isOpen) {
        widget.classList.add('open');
        toggleBtn.classList.add('open');
        this.renderMessages(); // Ensure messages are shown
        
        // Focus input
        setTimeout(() => this.shadowRoot.getElementById('chat-input').focus(), 300);
        
      } else {
        widget.classList.remove('open');
        toggleBtn.classList.remove('open');
      }
    }

    updateUIState() {
      const micBtn = this.shadowRoot.getElementById('mic-btn');
      const statusText = this.shadowRoot.getElementById('status-text');
      
      if (this.isListening) {
        micBtn.classList.add('listening');
        statusText.textContent = 'Listening...';
      } else if (this.isProcessing) {
        micBtn.classList.remove('listening');
        statusText.textContent = 'Thinking...';
      } else if (this.isSpeaking) {
         micBtn.classList.remove('listening');
         statusText.textContent = 'Speaking...';
      } else {
        micBtn.classList.remove('listening');
        statusText.textContent = 'Ready';
      }
    }

    render() {
      const styles = `
        :host {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
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
        }

        .toggle-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--primary);
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .toggle-btn:hover {
          transform: scale(1.05);
        }
        
        .toggle-btn svg {
          width: 30px;
          height: 30px;
          color: #000;
          transition: opacity 0.2s;
        }
        
        .toggle-btn .close-icon { display: none; }
        .toggle-btn.open .chat-icon { display: none; }
        .toggle-btn.open .close-icon { display: block; }

        .widget-container {
          width: 360px;
          height: 600px;
          max-height: calc(100vh - 100px);
          background: var(--bg);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          transform: translateY(20px) scale(0.95);
          transform-origin: bottom right;
          pointer-events: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .widget-container.open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: all;
        }

        .header {
          padding: 16px;
          background: var(--surface);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .title {
          font-weight: 600;
          color: var(--text);
          font-size: 16px;
        }

        .persona-select {
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          outline: none;
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }

        .message {
          max-width: 80%;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.5;
          word-wrap: break-word;
          animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .message.user {
          align-self: flex-end;
          background: ${CONFIG.theme.userBubble};
          color: white;
          border-bottom-right-radius: 2px;
        }

        .message.assistant {
          align-self: flex-start;
          background: ${CONFIG.theme.aiBubble};
          color: rgba(255,255,255,0.9);
          border-bottom-left-radius: 2px;
        }

        .controls {
          padding: 16px;
          background: var(--surface);
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .visualizer-container {
          height: 40px;
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        canvas {
          width: 100%;
          height: 100%;
        }

        .input-row {
          display: flex;
          gap: 8px;
        }

        input {
          flex: 1;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 10px 16px;
          color: white;
          outline: none;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        input:focus {
          border-color: var(--primary);
        }

        .icon-btn {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .icon-btn:hover {
          background: rgba(255,255,255,0.1);
          color: white;
        }

        .mic-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .mic-btn.listening {
          background: #ef4444;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        .status-text {
          font-size: 10px;
          color: rgba(255,255,255,0.5);
          text-align: center;
          margin-top: -8px;
        }
      `;

      this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        <div class="widget-wrapper">
          <div class="widget-container">
            <div class="header">
              <span class="title">AI Voice Chat</span>
              <select class="persona-select" id="persona-selector">
                <option value="assistant">Assistant</option>
                <option value="support">Support</option>
                <option value="sales">Sales</option>
                <option value="tech">Tech Expert</option>
              </select>
            </div>
            
            <div class="messages-area" id="messages-container">
              <div class="message assistant">Hello! I'm your AI assistant. Tap the microphone to speak or type a message.</div>
            </div>

            <div class="controls">
              <div class="visualizer-container">
                <canvas id="waveform" width="300" height="40"></canvas>
              </div>
              <div class="status-text" id="status-text">Ready</div>
              
              <div class="input-row">
                <input type="text" id="chat-input" placeholder="Type a message..." />
                <button class="mic-btn" id="mic-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                </button>
                <button class="icon-btn" id="send-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </div>
            </div>
          </div>

          <button class="toggle-btn">
            <svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;

      // Event Listeners
      this.shadowRoot.querySelector('.toggle-btn').addEventListener('click', () => this.toggleChat());
      this.shadowRoot.getElementById('mic-btn').addEventListener('click', () => this.toggleListening());
      
      const input = this.shadowRoot.getElementById('chat-input');
      const sendBtn = this.shadowRoot.getElementById('send-btn');
      
      const handleSend = () => {
        const text = input.value;
        if (text) this.handleUserMessage(text);
      };

      sendBtn.addEventListener('click', handleSend);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
      });

      this.shadowRoot.getElementById('persona-selector').addEventListener('change', (e) => {
        this.persona = e.target.value;
        this.addMessage('assistant', `Switched to ${e.target.options[e.target.selectedIndex].text} mode.`);
      });
    }
  }

  customElements.define('ai-voice-widget', AIVoiceWidget);

  // Auto-inject into body
  const widget = document.createElement('ai-voice-widget');
  document.body.appendChild(widget);

})();
