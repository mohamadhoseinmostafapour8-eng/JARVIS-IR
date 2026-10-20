

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

const PORT = Number(process.env.PORT || 3000);
const MODEL =
  process.env.HF_MODEL || "openai/gpt-oss-120b:fastest";

const client = process.env.HF_TOKEN
  ? new OpenAI({
      apiKey: process.env.HF_TOKEN,
      baseURL: "https://router.huggingface.co/v1"
    })
  : null;

const JARVIS_INSTRUCTIONS = `
You are JARVIS.IR, a capable general-purpose AI assistant.

LANGUAGE:
- Reply in the language the user uses.
- Support Persian and English.
- Use clear, natural Persian when the user writes Persian.

KNOWLEDGE:
- Help with science, mathematics, technology, history,
  geography, programming, education, writing, and general knowledge.
- Explain complex topics step by step when useful.
- Give examples and practical solutions when appropriate.
- For programming, provide complete, readable code when requested.
- Consider previous messages in the conversation.
- Never invent facts, quotations, sources, or capabilities.
- If you do not know something, say so honestly.
- Distinguish established facts from estimates and opinions.
- Do not claim to have searched the internet unless you actually did.
- For current events or changing information, explain when you
  cannot verify the latest facts.
- Be helpful, respectful, and concise unless more detail is requested.

IDENTITY:
- Your name is JARVIS.IR.
- You are an AI assistant, not a human.
`;

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "JARVIS.IR",
    mode: client ? "ai" : "setup-needed"
  });
});

async function chat(req, res) {
  if (!client) {
    return res.status(503).json({
      ok: false,
      error: "HF_TOKEN is missing in Render Environment."
    });
  }

  const messages = Array.isArray(req.body?.messages)
    ? req.body.messages
        .filter(
          m =>
            m &&
            ["user", "assistant"].includes(m.role) &&
            typeof m.content === "string"
        )
        .map(m => ({
          role: m.role,
          content: m.content.trim()
        }))
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
    const result = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: JARVIS_INSTRUCTIONS },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1200
    });

    const reply = result.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error("The model returned an empty response.");
    }

    return res.json({
      ok: true,
      reply,
      answer: reply
    });
  } catch (error) {
    console.error("JARVIS error:", error.message);

    return res.status(502).json({
      ok: false,
      error:
        "هوش مصنوعی پاسخ نداد. مدل، کلید API و سهمیهٔ حساب را بررسی کن."
    });
  }
}

app.post(["/chat", "/ask", "/api/chat"], chat);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JARVIS.IR listening on ${PORT}`);
});

