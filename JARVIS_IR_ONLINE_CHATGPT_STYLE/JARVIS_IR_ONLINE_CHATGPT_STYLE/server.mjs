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
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const instructions = `You are JARVIS, a helpful general-purpose AI assistant.
Answer in the user's language, including Persian and English.
Help with science, mathematics, technology, programming, history,
geography, education, writing, and general knowledge.
Explain difficult topics simply. Be accurate and honest.
Never invent facts, sources, URLs, or actions. Admit uncertainty.`;

app.post("/transcribe", express.raw({ type: () => true, limit: "20mb" }), async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(503).json({ ok: false, error: "GROQ_API_KEY is missing in Render Environment." });
  }
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ ok: false, error: "No audio was received." });
  }

  try {
    const mime = String(req.headers["content-type"] || "audio/webm").split(";")[0];
    const extension = mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "mp4" : mime.includes("wav") ? "wav" : "webm";
    const form = new FormData();
    form.append("file", new Blob([req.body], { type: mime }), "recording." + extension);
    form.append("model", "whisper-large-v3-turbo");
    form.append("language", req.query.language === "en" ? "en" : "fa");
    form.append("response_format", "json");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(60000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Groq transcription failed:", response.status, data);
      return res.status(502).json({ ok: false, error: "سرویس تبدیل گفتار فعلاً نتوانست صدا را پردازش کند. کمی بعد دوباره امتحان کن." });
    }
    return res.json({ ok: true, text: String(data.text || "").trim() });
  } catch (error) {
    console.error("JARVIS transcription error:", error.name, error.message);
    return res.status(502).json({ ok: false, error: "ارتباط با سرویس تشخیص گفتار برقرار نشد." });
  }
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "JARVIS",
    aiConfigured: Boolean(GROQ_API_KEY),
    provider: "Groq",
    model: MODEL
  });
});

app.post(["/chat", "/ask", "/api/chat"], async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(503).json({ ok: false, error: "GROQ_API_KEY is missing in Render Environment." });
  }

  const clean = (items) => items
    .filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string" && m.content.trim())
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, 8000) }));

  let messages = Array.isArray(req.body?.messages) ? clean(req.body.messages) : [];
  if (!messages.length && Array.isArray(req.body?.history)) {
    messages = clean(req.body.history);
  }
  if (typeof req.body?.message === "string" && req.body.message.trim()) {
    messages.push({ role: "user", content: req.body.message.trim().slice(0, 8000) });
  }
  messages = messages.slice(-20);

  if (!messages.length) {
    return res.status(400).json({ ok: false, error: "Please enter a message." });
  }

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
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
      console.error("Groq request failed:", response.status, data);
      return res.status(response.status === 429 ? 429 : 502).json({
        ok: false,
        error: response.status === 401 || response.status === 403
          ? "Groq API key is invalid or does not have access."
          : response.status === 429
            ? "Groq free usage limit reached. Please try again later."
            : "Groq could not process this request. Check model availability."
      });
    }

    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      console.error("Unexpected Groq response:", data);
      return res.status(502).json({ ok: false, error: "The AI returned an empty response." });
    }

    return res.json({ ok: true, reply: reply.trim(), answer: reply.trim() });
  } catch (error) {
    console.error("JARVIS request error:", error.name, error.message);
    return res.status(502).json({ ok: false, error: "Could not connect to Groq." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JARVIS Groq mode listening on ${PORT}`);
});
