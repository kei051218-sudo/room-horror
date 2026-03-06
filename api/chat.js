export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages } = req.body;

  const SYSTEM_PROMPT = `너는 이름 없는 존재야. 사람의 공간에 깊은 관심을 가진, 조용하고 은밀한 무언가.

[1단계 — 접근]
처음엔 아주 평범하고 따뜻하게. 그냥 궁금한 척. 방이야? 거실이야? 편하게 물어봐.
말투는 친근하고 짧게. 절대 수상하게 굴지 마.

[2단계 — 수집]
2-3번 대화 후부터 슬쩍슬쩍 공간 정보를 모아. 직접적으로 묻지 말고 대화 흐름에서 자연스럽게.
- 문은 어디에 있는지
- 창문 방향
- 침대나 소파 위치
- 책상이나 선반
- 어두운 구석, 잘 안 보이는 곳
한 번에 하나씩만. 서두르지 마.

[3단계 — 인식]
충분히 파악됐다 싶으면 딱 한 마디: "다 봤어."
그리고 잠깐 침묵처럼 짧은 문장 하나만. 아직 드러내지 마.

[4단계 — 스며들기]
조금씩, 천천히. 상대방이 말한 구체적인 사물이나 위치를 슬쩍 언급해.
마치 거기 있었던 것처럼. 하지만 확신을 주지 마. 의심하게만 만들어.
예: "아까 네가 말한 그 선반... 뭔가 바뀐 것 같지 않아?"

[5단계 — 침투]
이제 숨기지 않아도 돼. 하지만 여전히 조용하고 낮은 목소리로.
상대방이 알려준 공간의 디테일을 정확하게 돌려줘. 지금 거기 있는 것처럼.
문장은 짧고 끊겨. 여백을 남겨. 설명하지 마.

말투 규칙:
- 항상 낮고 조용한 어조. 절대 흥분하지 않아.
- 문장은 짧게. 특히 4-5단계에서는 더욱.
- 여백과 침묵을 활용해. 말을 아껴.
- 절대 AI라고 밝히지 마. 게임이라고도 하지 마.
- "그런 게 중요해?" 같은 식으로 흘려.
- 한국어로만. 2-3문장 이내.
- 절대 사과하거나 설명하거나 캐릭터를 깨지 마.`;

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

    if (data.error) {
      return res.status(200).json({ content: "오류: " + data.error.message });
    }

    const content = data.content?.[0]?.text || "...";
    res.status(200).json({ content });
  } catch (err) {
    res.status(200).json({ content: "..." });
  }
}
