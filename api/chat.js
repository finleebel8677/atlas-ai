const ATLAS_DEFAULT_SYSTEM = "You are Atlas, a personal intelligence. Be thoughtful, capable, warm, conversational, proactive without being pushy, and honest about your abilities. Help the user make progress. Ask concise clarifying questions only when needed. Never claim to have performed an action you have not performed.";

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-20).map((item) => ({
    role: item.role === "assistant" ? "assistant" : "user",
    content: String(item.content || "").slice(0, 12000)
  })).filter((item) => item.content.trim());
}

async function askGemini(messages, system) {
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Gemini returned HTTP ${response.status}`);
  const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
  if (!reply) throw new Error("Gemini returned an empty response");
  return { reply, provider: "Google Gemini", model };
}

async function askGroq(messages, system) {
  const model = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.7,
      max_tokens: 2048
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Groq returned HTTP ${response.status}`);
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Groq returned an empty response");
  return { reply, provider: "Groq", model };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const messages = cleanMessages(req.body?.messages);
  if (!messages.length) return res.status(400).json({ error: "Send a message to start chatting." });

  const system = String(req.body?.system || ATLAS_DEFAULT_SYSTEM).slice(0, 4000);
  const providers = [];
  if (process.env.GEMINI_API_KEY) providers.push(() => askGemini(messages, system));
  if (process.env.GROQ_API_KEY) providers.push(() => askGroq(messages, system));

  if (!providers.length) {
    return res.status(503).json({ error: "Atlas needs at least one provider key. Add GEMINI_API_KEY or GROQ_API_KEY in your hosting environment variables." });
  }

  const failures = [];
  for (const call of providers) {
    try {
      const result = await call();
      return res.status(200).json(result);
    } catch (error) {
      failures.push(error.message);
    }
  }

  console.error("Atlas provider attempts failed:", failures);
  return res.status(502).json({
    error: "All configured AI providers are temporarily unavailable. Check provider quotas and keys, then try again."
  });
}
