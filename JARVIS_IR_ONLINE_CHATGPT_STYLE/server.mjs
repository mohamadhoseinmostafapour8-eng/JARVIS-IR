
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

const PORT = Number(process.env.PORT || 3000);
const TOKEN = process.env.HF_TOKEN;
const MODEL = process.env.HF_MODEL || "openai/gpt-oss-120b:fastest";

const ai = TOKEN
  ? new OpenAI({
      apiKey: TOKEN,
      baseURL: "https://router.huggingface.co/v1"
    })
  : null;

const instructions = `
You are JARVIS.IR, a helpful general-purpose AI assistant.
Answer in the user's language, including Persian and English.
Help with science, technology, mathematics, history, programming,
education, and general questions.
Explain difficult topics simply. Be accurate and honest.
Never invent facts. Admit uncertainty when necessary.
`;

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "JARVIS.IR",
    mode: ai ? "huggingface" : "missing-token"
  });
});

async function chat(req, res) {
  if (!ai) {
    return res.status(503).json({
      ok: false,
      error: "HF_TOKEN is missing in Render Environment."
    });
  }

  const messages = Array.isArray(req.body?.messages)
    ? req.body.messages
        .filter(m =>
          m &&
          ["user", "assistant"].includes(m.role) &&
          typeof m.content === "string"
        )
        .map(m => ({ role: m.role, content: m.content.trim() }))
        .filter(m => m.content)
        .slice(-20)
    : [];

  if (!messages.length) {
    return res.status(400).json({
      ok: false,
      error: "Please enter a message."
    });
  }

  try {
    const result = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: instructions },
        ...messages
      ],
      max_tokens: 1000
    });

    const reply = result.choices?.[0]?.message?.content;
    if (!reply) throw new Error("Empty model response");

    return res.json({ ok: true, reply, answer: reply });
  } catch (error) {
    console.error("JARVIS AI error:", error.status, error.message);
    return res.status(502).json({
      ok: false,
      error: "هوش مصنوعی پاسخ نداد؛ کلید، مدل و سهمیه را بررسی کن."
    });
  }
}

app.post(["/chat", "/ask", "/api/chat"], chat);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JARVIS.IR listening on ${PORT}`);
});

