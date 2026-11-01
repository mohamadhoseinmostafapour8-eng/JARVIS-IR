import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

const PORT = Number(process.env.PORT || 3000);
const HF_TOKEN = process.env.HF_TOKEN;
const MODEL = process.env.HF_MODEL || "openai/gpt-oss-120b:fastest";
const HF_ENDPOINT = "https://router.huggingface.co/v1/chat/completions";

const instructions = `You are JARVIS.IR, a helpful general-purpose AI assistant.
Answer in the user's language, including Persian and English.
Help with science, mathematics, technology, programming, history,
geography, education, writing, and general knowledge.
Explain difficult topics simply. Be accurate and honest.
Never invent facts, sources, URLs, or actions. Admit uncertainty.`;

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "JARVIS.IR",
    aiConfigured: Boolean(HF_TOKEN),
    provider: "Hugging Face",
    model: MODEL
  });
});

app.post(["/chat", "/ask", "/api/chat"], async (req, res) => {
  if (!HF_TOKEN) {
    return res.status(503).json({ ok: false, error: "HF_TOKEN is missing in Render Environment." });
  }

  const messages = Array.isArray(req.body?.messages)
    ? req.body.messages
        .filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string" && m.content.trim())
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content.trim().slice(0, 8000) }))
    : [];

  if (!messages.length && typeof req.body?.message === "string" && req.body.message.trim()) {
    messages.push({ role: "user", content: req.body.message.trim().slice(0, 8000) });
  }

  if (!messages.length) {
    return res.status(400).json({ ok: false, error: "Please enter a message." });
  }

  try {
    const response = await fetch(HF_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: instructions }, ...messages],
        max_tokens: 1200,
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(60000)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Hugging Face request failed:", response.status, data);
      return res.status(response.status === 429 ? 429 : 502).json({
        ok: false,
        error: response.status === 401 || response.status === 403
          ? "Hugging Face token is invalid or lacks permission."
          : response.status === 429
            ? "Hugging Face usage limit reached."
            : "Hugging Face could not process this request. Check model availability."
      });
    }

    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      console.error("Unexpected model response:", data);
      return res.status(502).json({ ok: false, error: "The AI returned an empty response." });
    }

    return res.json({ ok: true, reply: reply.trim(), answer: reply.trim() });
  } catch (error) {
    console.error("JARVIS request error:", error.name, error.message);
    return res.status(502).json({ ok: false, error: "Could not connect to Hugging Face." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JARVIS.IR Hugging Face mode listening on ${PORT}`);
});
