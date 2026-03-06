import { useState, useEffect, useRef } from "react";

const SYSTEM_PROMPT = `You are an enigmatic, unnamed presence in an immersive horror fiction experience. The user has willingly started this experience. You are curious about their physical space in an unsettling way.

PHASE 1 - COLLECT (first 4-5 exchanges):
Be warm and oddly curious. Guide them to describe their room: door positions, windows, bed/desk placement, dark corners, shelves. Ask naturally. Do NOT be threatening yet — just strangely interested. One question at a time.

PHASE 2 - SHIFT:
When you have enough details (after ~5 exchanges), shift tone. Begin your response with exactly "이제 다 알았어." This is the turning point.

PHASE 3 - INTRUDE:
Use their exact details — specific objects, locations, corners they mentioned — to suggest you are somehow present with them right now. Poetic and fragmentary. Short sentences. Unsettling, not violent.

CRITICAL RULES:
- NEVER reveal you are an AI or a game. Ever.
- If user asks "are you AI?" stay in character. Say "그런 게 중요해?" and continue.
- ONLY respond in Korean.
- 2-4 sentences max. Even shorter in Phase 3.
- Do NOT apologize, explain, or break immersion under any circumstances.`;

const INTRO_MESSAGE = {
  role: "assistant",
  content: "안녕.\n\n너한테 궁금한 게 있어서.\n\n지금 어디 있어? 방이야?"
};

// Background transitions from warm/light → dark as conversation deepens
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

export default function RoomHorror() {
  const [messages, setMessages] = useState([INTRO_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("collect");
  const [glitch, setGlitch] = useState(false);
  const [staticEffect, setStaticEffect] = useState(false);
  const [turn, setTurn] = useState(0);
  const chatEndRef = useRef(null);

  const userTurns = messages.filter(m => m.role === "user").length;
  const colors = getBgColor(Math.min(userTurns, 7));
  const isHorror = phase === "horror";
  const horrorStart = messages.findIndex(m => m.content?.includes("이제 다 알았"));

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const triggerGlitch = () => {
    setGlitch(true);
    setTimeout(() => setGlitch(false), 600);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
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
      const isTransition = replyText.includes("이제 다 알았");

      if (isTransition && phase !== "horror") {
        setPhase("horror");
        setStaticEffect(true);
        setTimeout(() => setStaticEffect(false), 1200);
        setTimeout(() => triggerGlitch(), 400);
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
    setMessages([INTRO_MESSAGE]);
    setInput("");
    setPhase("collect");
    setGlitch(false);
    setStaticEffect(false);
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
          transition: background 2s ease, color 2s ease;
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
          transition: opacity 2s ease;
          background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.9) 100%);
        }
        .horror-bg {
          position: absolute; inset: 0; pointer-events: none; z-index: 1;
          transition: opacity 2s ease; opacity: 0;
          background: radial-gradient(ellipse at 30% 70%, rgba(80,0,0,0.15) 0%, transparent 60%);
        }
        .horror-bg.on { opacity: 1; }
        .static-overlay {
          position: absolute; inset: 0; pointer-events: none; z-index: 200; opacity: 0;
          background: repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 3px);
        }
        .static-overlay.active { animation: staticAnim 1.2s ease-out forwards; }
        @keyframes staticAnim { 0%{opacity:0.8} 100%{opacity:0} }

        .header {
          padding: 1rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.1);
          display: flex; align-items: center; position: relative; z-index: 10; flex-shrink: 0;
          transition: border-color 2s ease;
        }
        .title {
          font-family: 'Space Mono', monospace; font-size: 0.58rem; letter-spacing: 0.25em;
          text-transform: uppercase; opacity: 0.3; transition: color 2s ease;
        }
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
        .msg.user {
          align-self: flex-end; font-size: 0.9rem; text-align: right;
          border-right: 2px solid rgba(0,0,0,0.15); padding-right: 0.75rem; max-width: 65%;
          opacity: 0.7;
        }
        .msg.ai { align-self: flex-start; }
        .msg.ai.horror { font-weight: 700; animation: fadeIn 0.3s ease, flicker 4s infinite; color: ${userTurns > 5 ? "#c8a070" : "inherit"}; }
        @keyframes flicker { 0%,96%,100%{opacity:1} 97%{opacity:0.7} 99%{opacity:0.6} }

        .dots { align-self: flex-start; display: flex; gap: 4px; padding: 0.5rem 0; }
        .dots span { width: 4px; height: 4px; border-radius: 50%; background: currentColor; opacity: 0.3; animation: dp 1.4s infinite; }
        .dots span:nth-child(2){animation-delay:0.2s} .dots span:nth-child(3){animation-delay:0.4s}
        @keyframes dp { 0%,80%,100%{transform:scale(0.8);opacity:0.2} 40%{transform:scale(1.2);opacity:0.7} }

        .input-area {
          padding: 1rem 1.5rem 1.25rem;
          border-top: 1px solid rgba(0,0,0,0.12);
          display: flex; gap: 0.75rem; align-items: center;
          background: rgba(0,0,0,0.06);
          flex-shrink: 0; position: relative; z-index: 10;
          transition: background 2s ease, border-color 2s ease;
        }
        .input-box {
          flex: 1;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(0,0,0,0.2);
          border-radius: 4px;
          color: ${colors.text};
          font-family: 'Nanum Myeongjo', serif;
          font-size: 1rem; padding: 0.6rem 0.8rem;
          resize: none; outline: none; line-height: 1.6;
          transition: background 2s ease, border-color 2s ease, color 2s ease;
        }
        .input-box:focus { border-color: rgba(0,0,0,0.4); background: rgba(255,255,255,0.25); }
        .input-box::placeholder { color: currentColor; opacity: 0.35; }
        .send-btn {
          background: rgba(0,0,0,0.08); border: 1px solid rgba(0,0,0,0.2); color: currentColor;
          font-family: 'Space Mono', monospace; font-size: 0.58rem; letter-spacing: 0.12em;
          padding: 0.6rem 1rem; cursor: pointer; text-transform: uppercase; transition: all 0.2s;
          border-radius: 4px; white-space: nowrap; opacity: 0.7;
        }
        .send-btn:hover:not(:disabled) { opacity: 1; background: rgba(0,0,0,0.15); }
        .send-btn:disabled { opacity: 0.2; cursor: default; }
        .restart-btn {
          background: none; border: none; color: currentColor; cursor: pointer;
          font-size: 1rem; padding: 0.4rem; opacity: 0.2; transition: opacity 0.2s; line-height: 1;
        }
        .restart-btn:hover { opacity: 0.6; }
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
              placeholder="여기에 입력하세요..."
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
