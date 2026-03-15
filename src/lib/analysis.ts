import { AnalysisResult, Message } from "@/types";

const MOORCHEH_API_URL = "https://api.moorcheh.ai/v1/answer";

export async function analyzeConversation(
  messages: Message[],
  userName: string,
  otherName: string
): Promise<AnalysisResult> {
  const conversationText = messages
    .map((m) => `${m.senderName}: ${m.content}`)
    .join("\n");

  const response = await fetch(MOORCHEH_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.MOORCHEH_API_KEY!,
    },
    body: JSON.stringify({
      namespace: "",
      query: `Analyze this conversation. We care about ${userName}'s perspective. The other person is ${otherName}.

Conversation:
${conversationText}

Analyze for:
- Effort balance (who is putting in more effort, as percentages summing to 100)
- Power dynamics (who holds more conversational influence, as percentages summing to 100)
- Behavioral signals (low investment, disengagement, delayed reciprocity, love bombing, breadcrumbing, etc.)
- Ghosting probability (0-100)
- Manipulation signals (one of: none, mild, moderate, high)
- Attachment style of ${otherName} (e.g. avoidant, anxious, secure, disorganized)
- A concrete, actionable recommendation for ${userName}

Respond ONLY with a valid JSON object in this exact shape, no markdown, no explanation:
{
  "effort_balance": { "user_percentage": <number>, "other_percentage": <number> },
  "power_dynamic": { "user": <number>, "other": <number> },
  "signals_detected": [<string>, ...],
  "ghosting_probability": <number>,
  "manipulation_signals": "<none|mild|moderate|high>",
  "recommendation": "<string>",
  "behavioral_patterns": [<string>, ...],
  "attachment_style": "<string>"
}`,
      aiModel: "anthropic.claude-sonnet-4-5-20250929-v1:0",
      temperature: 0.3,
      headerPrompt:
        "You are an expert relationship dynamics analyst trained in behavioral psychology. Be direct but compassionate — honest, a little funny, genuinely helpful. Always respond with valid JSON only.",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Moorcheh API error ${response.status}: ${text}`);
  }

  const data = await response.json();

  // Moorcheh wraps the answer in a `answer` or `response` field
  const raw: string = data.answer ?? data.response ?? data.text ?? JSON.stringify(data);

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  return JSON.parse(cleaned) as AnalysisResult;
}
