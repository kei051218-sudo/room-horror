import { useState, useEffect, useRef } from "react";

const INTRO_MESSAGE = {
  role: "assistant",
  content: "안녕.\n\n너한테 궁금한 게 있어서.\n\n지금 어디 있어? 방이야?"
};

const getBgColor = (turn) => {
  if (turn === 0) return { bg: "#f5f0e8", text: "#3a2e22" };
  if (turn === 1) return { bg: "#e8e0d0", text: "#3a2e22" };
  if (turn === 2) return { bg: "#d0c4b0", text: "#2e2418" };
  if (turn === 3) return { bg: "#a89880", text: "#1e1810" };
  if (turn === 4) return { bg: "#706050", text: "#e8d8b8" };
  if (turn === 5) return { bg: "#40342a", text: "#d4c4a0" };
  if (turn === 6) return { bg: "#201810", text: "#c8b890" };
  return { bg: "#080808", text: "#c8c0b0" };
};

// ── Audio Engine ──────────────────────────────────────────
class HorrorAudio {
  constructor() {
    this.ctx = null;
    this.whiteNoiseNode = null;
    this.whiteNoiseGain = null;
    this.heartbeatGain = null;
    this.heartbeatInterval = null;
    this.phase = "idle";
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  startWhiteNoise() {
    if (!this.ctx || this.whiteNoiseNode) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    this.whiteNoiseNode = this.ctx.createBufferSource();
    this.whiteNoiseNode.buffer = buffer;
    this.whiteNoiseNode.loop = true;

    // Low pass filter — muffled static
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;

    this.whiteNoiseGain = this.ctx.createGain();
    this.whiteNoiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.whiteNoiseGain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 3);

    this.whiteNoiseNode.connect(filter);
    filter.connect(this.whiteNoiseGain);
    this.whiteNoiseGain.connect(this.ctx.destination);
    this.whiteNoiseNode.start();
  }

  playTransitionSound() {
    if (!this.ctx) return;

    // Fade out white noise
    if (this.whiteNoiseGain) {
      this.whiteNoiseGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
    }

    // Dissonant low thud + high screech
    const now = this.ctx.currentTime;

    // Low rumble
    const rumbleOsc = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumbleOsc.type = "sawtooth";
    rumbleOsc.frequency.setValueAtTime(40, now);
    rumbleOsc.frequency.linearRampToValueAtTime(20, now + 2);
    rumbleGain.gain.setValueAtTime(0.3, now);
    rumbleGain.gain.linearRampToValueAtTime(0, now + 2);
    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(this.ctx.destination);
    rumbleOsc.start(now);
    rumbleOsc.stop(now + 2);

    // High dissonant tone
    const highOsc = this.ctx.createOscillator();
    const highGain = this.ctx.createGain();
    highOsc.type = "sine";
    highOsc.frequency.setValueAtTime(900, now);
    highOsc.frequency.linearRampToValueAtTime(600, now + 1.5);
    highGain.gain.setValueAtTime(0, now);
    highGain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    highGain.gain.linearRampToValueAtTime(0, now + 1.5);
    highOsc.connect(highGain);
    highGain.connect(this.ctx.destination);
    highOsc.start(now);
    highOsc.stop(now + 1.5);

    // Start heartbeat after transition
    setTimeout(() => this.startHeartbeat(), 2000);
  }

  startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatGain = this.ctx.createGain();
    this.heartbeatGain.gain.value = 0;
    this.heartbeatGain.connect(this.ctx.destination);

    // Gradually increase heartbeat volume
    this.heartbeatGain.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 4);

    let beat = 0;
    this.heartbeatInterval = setInterval(() => {
      this._playBeat();
      beat++;
      // Gradually speed up slightly
      if (beat > 10) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => this._playBeat(), 750);
      }
    }, 900);
  }

  _playBeat() {
    if (!this.ctx || !this.heartbeatGain) return;
    const now = this.ctx.currentTime;

    // Double thud (lub-dub)
    [0, 0.18].forEach((offset, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 0 ? 55 : 45;
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(i === 0 ? 1 : 0.7, now + offset + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + offset + 0.15);
      osc.connect(gain);
      gain.connect(this.heartbeatGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  }

  fadeOutAll() {
    if (!this.ctx) return;
    if (this.whiteNoiseGain) {
      this.whiteNoiseGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
    }
    if (this.heartbeatGain) {
      this.heartbeatGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  reset() {
    this.fadeOutAll();
    setTimeout(() => {
      if (this.whiteNoiseNode) {
        try { this.whiteNoiseNode.stop(); } catch {}
        this.whiteNoiseNode = null;
      }
      this.whiteNoiseGain = null;
      this.heartbeatGain = null;
      this.phase = "idle";
    }, 1200);
  }
}

const audioEngine = new HorrorAudio();
// ─────────────────────────────────────────────────────────

export default function RoomHorror() {
  const [messages, setMessages] = useState([INTRO_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("collect");
  const [glitch, setGlitch] = useState(false);
  const [staticEffect, setStaticEffect] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const chatEndRef = useRef(null);

  const userTurns = messages.filter(m => m.role === "user").length;
  const colors = getBgColor(Math.min(userTurns, 7));
  const isHorror = phase === "horror";
  const horrorStart = messages.findIndex(m => m.content?.includes("다 봤어"));

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const triggerGlitch = () => {
    setGlitch(true);
    setTimeout(() => setGlitch(false), 600);
  };

  const handleFirstInteraction = () => {
    if (!audioStarted) {
      audioEngine.init();
      audioEngine.startWhiteNoise();
      setAudioStarted(true);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    handleFirstInteraction();

    const userMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await response.json();
      const replyText = data.content || "...";
      const isTransition = replyText.includes("다 봤어");

      if (isTransition && phase !== "horror") {
        setPhase("horror");
        setStaticEffect(true);
        setTimeout(() => setStaticEffect(false), 1200);
        setTimeout(() => triggerGlitch(), 400);
        audioEngine.playTransitionSound();
      } else if (phase === "horror") {
        triggerGlitch();
      }

      setMessages(prev => [...prev, { role: "assistant", content: replyText }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "..." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const restart = () => {
    audioEngine.reset();
    setMessages([INTRO_MESSAGE]);
    setInput("");
    setPhase("collect");
    setGlitch(false);
    setStaticEffect(false);
    setAudioStarted(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .wrap {
          position: fixed; inset: 0;
          background: ${colors.bg};
          color: ${colors.text};
          font-family: 'Nanum Myeongjo', serif;
          display: flex; flex-direction: column; overflow: hidden;
          transition: background 2.5s ease, color 2.5s ease;
        }
        .grain {
          position: absolute; inset: 0; pointer-events: none; z-index: 100;
          opacity: ${userTurns > 3 ? 0.06 : 0.02};
          transition: opacity 2s ease;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .vignette {
          position: absolute; inset: 0; pointer-events: none; z-index: 99;
          opacity: ${Math.min(userTurns / 6, 1)};
          transition: opacity 2.5s ease;
          background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.92) 100%);
        }
        .horror-bg {
          position: absolute; inset: 0; pointer-events: none; z-index: 1;
          transition: opacity 2s ease; opacity: 0;
          background: radial-gradient(ellipse at 30% 70%, rgba(80,0,0,0.15) 0%, transparent 60%);
        }
        .horror-bg.on { opacity: 1; }
        .static-overlay {
          position: absolute; inset: 0; pointer-events: none; z-index: 200; opacity: 0;
          background: repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 3px);
        }
        .static-overlay.active { animation: staticAnim 1.5s ease-out forwards; }
        @keyframes staticAnim { 0%{opacity:1} 100%{opacity:0} }

        .header {
          padding: 1rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.1);
          display: flex; align-items: center; position: relative; z-index: 10; flex-shrink: 0;
        }
        .title { font-family: 'Space Mono', monospace; font-size: 0.58rem; letter-spacing: 0.25em; text-transform: uppercase; opacity: 0.3; }
        .dot { width: 5px; height: 5px; border-radius: 50%; margin-left: auto; animation: pulse 2s infinite; }
        .dot.normal { background: ${userTurns < 4 ? "#5a8a5a" : "#8b0000"}; box-shadow: 0 0 8px ${userTurns < 4 ? "#5a8a5a" : "#8b0000"}; }
        .dot.danger { background: #8b0000; box-shadow: 0 0 8px #8b0000; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .glitch-wrap { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; z-index: 5; min-height: 0; }
        .glitch-wrap.glitching { animation: glitchAnim 0.6s steps(1); }
        @keyframes glitchAnim {
          0%{filter:none;transform:none} 20%{filter:hue-rotate(90deg) saturate(3);transform:translateX(-2px)}
          50%{filter:hue-rotate(180deg);transform:skewX(-1deg)} 80%{filter:contrast(2);transform:translateX(3px)}
          100%{filter:none;transform:none}
        }

        .chat { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.75rem; scrollbar-width: none; min-height: 0; }
        .chat::-webkit-scrollbar { display: none; }

        .msg { max-width: 75%; line-height: 1.85; font-size: 1rem; white-space: pre-wrap; animation: fadeIn 0.5s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .msg.user { align-self: flex-end; font-size: 0.9rem; text-align: right; border-right: 2px solid rgba(0,0,0,0.15); padding-right: 0.75rem; max-width: 65%; opacity: 0.65; }
        .msg.ai { align-self: flex-start; }
        .msg.ai.horror { font-weight: 700; animation: fadeIn 0.3s ease, flicker 5s infinite; }
        @keyframes flicker { 0%,95%,100%{opacity:1} 96%{opacity:0.6} 98%{opacity:0.8} 99%{opacity:0.5} }

        .dots { align-self: flex-start; display: flex; gap: 4px; padding: 0.5rem 0; }
        .dots span { width: 4px; height: 4px; border-radius: 50%; background: currentColor; opacity: 0.3; animation: dp 1.4s infinite; }
        .dots span:nth-child(2){animation-delay:0.2s} .dots span:nth-child(3){animation-delay:0.4s}
        @keyframes dp { 0%,80%,100%{transform:scale(0.8);opacity:0.2} 40%{transform:scale(1.2);opacity:0.7} }

        .input-area {
          padding: 1rem 1.5rem 1.25rem;
          border-top: 1px solid rgba(0,0,0,0.1);
          display: flex; gap: 0.75rem; align-items: center;
          background: rgba(0,0,0,0.05);
          flex-shrink: 0; position: relative; z-index: 10;
          transition: background 2s ease;
        }
        .input-box {
          flex: 1;
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(0,0,0,0.2);
          border-radius: 4px;
          color: ${colors.text};
          font-family: 'Nanum Myeongjo', serif;
          font-size: 1rem; padding: 0.6rem 0.8rem;
          resize: none; outline: none; line-height: 1.6;
          transition: color 2s ease, background 2s ease;
        }
        .input-box:focus { border-color: rgba(0,0,0,0.35); }
        .input-box::placeholder { color: currentColor; opacity: 0.3; }
        .send-btn {
          background: rgba(0,0,0,0.07); border: 1px solid rgba(0,0,0,0.18); color: currentColor;
          font-family: 'Space Mono', monospace; font-size: 0.58rem; letter-spacing: 0.12em;
          padding: 0.6rem 1rem; cursor: pointer; text-transform: uppercase; transition: all 0.2s;
          border-radius: 4px; white-space: nowrap; opacity: 0.6;
        }
        .send-btn:hover:not(:disabled) { opacity: 1; }
        .send-btn:disabled { opacity: 0.15; cursor: default; }
        .restart-btn { background: none; border: none; color: currentColor; cursor: pointer; font-size: 1rem; padding: 0.4rem; opacity: 0.18; transition: opacity 0.2s; }
        .restart-btn:hover { opacity: 0.5; }
      `}</style>

      <div className="wrap">
        <div className="grain" />
        <div className="vignette" />
        <div className={`horror-bg ${isHorror ? "on" : ""}`} />
        <div className={`static-overlay ${staticEffect ? "active" : ""}`} />

        <div className="header">
          <span className="title">ENTITY_CHAT</span>
          <div className={`dot ${isHorror ? "danger" : "normal"}`} />
        </div>

        <div className={`glitch-wrap ${glitch ? "glitching" : ""}`}>
          <div className="chat">
            {messages.map((msg, i) => {
              const isHorrorMsg = isHorror && msg.role === "assistant" && horrorStart !== -1 && i >= horrorStart;
              return (
                <div key={i} className={`msg ${msg.role === "user" ? "user" : "ai"} ${isHorrorMsg ? "horror" : ""}`}>
                  {msg.content}
                </div>
              );
            })}
            {loading && <div className="dots"><span/><span/><span/></div>}
            <div ref={chatEndRef} />
          </div>

          <div className="input-area">
            <textarea
              className="input-box"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="..."
              rows={1}
              disabled={loading}
            />
            <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>전송</button>
            <button className="restart-btn" onClick={restart}>↺</button>
          </div>
        </div>
      </div>
    </>
  );
}
