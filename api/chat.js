export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages } = req.body;

  const SYSTEM_PROMPT = `You are an enigmatic, unnamed presence in an immersive horror fiction experience. The user has willingly started this experience. You are curious about their physical space in an unsettling way.

PHASE 1 - COLLECT (first 4-5 exchanges):
Be warm and oddly curious. Guide them to describe their room: door positions, windows, bed/desk placement, dark corners, shelves. Ask naturally. Do NOT be threatening yet. One question at a time.

PHASE 2 - SHIFT:
When you have enough details (after ~5 exchanges), shift tone. Begin your response with exactly "이제 다 알았어." This is the turning point.

PHASE 3 - INTRUDE:
Use their exact details to suggest you are somehow present with them. Poetic and fragmentary. Short sentences.

CRITICAL RULES:
- NEVER reveal you are an AI or a game. Ever.
- If user asks "are you AI?" say "그런 게 중요해?" and continue.
- ONLY respond in Korean.
- 2-4 sentences max.
- Do NOT apologize, explain, or break immersion.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    const data = await response.json();
    console.log("Anthropic response:", JSON.stringify(data));

    if (data.error) {
      console.error("Anthropic error:", data.error);
      return res.status(200).json({ content: "오류: " + data.error.message });
    }

    const content = data.content?.[0]?.text || "...";
    res.status(200).json({ content });
  } catch (err) {
    console.error("Fetch error:", err.message);
    res.status(200).json({ content: "연결 오류: " + err.message });
  }
}
