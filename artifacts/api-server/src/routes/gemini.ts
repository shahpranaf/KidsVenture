import { Router } from "express";

const router = Router();

type GeminiPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
};

type FamilyCoachResponse = {
  reply: string;
  summary: string;
  focusAreas: string[];
};

function stripJsonFences(value: string) {
  return value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function fallbackResponse(note: string): FamilyCoachResponse {
  const text = note.toLowerCase();
  const focusAreas: string[] = [];
  if (text.includes("confiden") || text.includes("shy") || text.includes("anxious") || text.includes("nervous")) focusAreas.push("confidence");
  if (text.includes("focus") || text.includes("distract") || text.includes("math") || text.includes("read") || text.includes("school")) focusAreas.push("focus");
  if (text.includes("write") || text.includes("creative") || text.includes("idea") || text.includes("draw")) focusAreas.push("creative");
  if (text.includes("friend") || text.includes("share") || text.includes("social") || text.includes("kind")) focusAreas.push("social");
  if (text.includes("frustrat") || text.includes("angry") || text.includes("patien")) focusAreas.push("emotional regulation");
  const focus = focusAreas[0] ?? "confidence";
  return {
    focusAreas: [focus],
    summary: `Personalized around ${focus}. The next mission should be concrete, encouraging, and easy to finish in one short sitting.`,
    reply: `I’ll tune the next mission around ${focus}, keep the screen window short, and end with a simple parent-child activity. This is guidance, not a diagnosis.`,
  };
}

router.post("/gemini/family-coach", async (req, res) => {
  const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) : "";
  const child = req.body?.child ?? {};

  if (!note) {
    res.status(400).json({ error: "A parent note is required." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.json(fallbackResponse(note));
    return;
  }

  const prompt = `You are KidVenture Family Coach, a supportive family learning guide for children ages 6 to 10.

The parent wrote:
"${note}"

Child context:
${JSON.stringify({
    name: typeof child.name === "string" ? child.name.slice(0, 40) : "",
    age: typeof child.age === "number" ? child.age : 8,
    interests: Array.isArray(child.interests) ? child.interests.slice(0, 5) : [],
    completed: Array.isArray(child.completed) ? child.completed : [],
    scores: child.scores ?? {},
    existingFocusAreas: Array.isArray(child.focusAreas) ? child.focusAreas.slice(0, 4) : [],
  })}

Return only valid JSON with this exact shape:
{
  "reply": "A warm, concise response to the parent in 2-4 sentences.",
  "summary": "One concise sentence describing how the next mission trail will be adapted.",
  "focusAreas": ["one to four short labels"]
}

Rules:
- Never diagnose, label, or make medical claims.
- Do not shame the child or parent.
- Suggest small, practical changes to mission wording, pacing, confidence, focus, creativity, social connection, or emotional regulation.
- Keep the app's daily screen time short and always include an offline parent-child handoff.
- Do not recommend more screen time as the solution.
- If the note describes serious risk or harm, calmly recommend contacting a qualified professional or local emergency support instead of trying to solve it in the app.`;

  try {
    const apiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "Follow the KidVenture Family Coach safety rules exactly. Output JSON only." }],
          },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!apiResponse.ok) {
      throw new Error(`Gemini responded with ${apiResponse.status}`);
    }

    const payload = (await apiResponse.json()) as GeminiResponse;
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!text) throw new Error("Gemini returned no content");

    const parsed = JSON.parse(stripJsonFences(text)) as Partial<FamilyCoachResponse>;
    if (typeof parsed.reply !== "string" || typeof parsed.summary !== "string" || !Array.isArray(parsed.focusAreas)) {
      throw new Error("Gemini returned an invalid coach shape");
    }

    res.json({
      reply: parsed.reply.slice(0, 900),
      summary: parsed.summary.slice(0, 300),
      focusAreas: parsed.focusAreas.filter((area): area is string => typeof area === "string").slice(0, 4),
    } satisfies FamilyCoachResponse);
  } catch (error) {
    req.log?.warn({ err: error }, "Gemini Family Coach failed; using local fallback");
    res.json(fallbackResponse(note));
  }
});

export default router;