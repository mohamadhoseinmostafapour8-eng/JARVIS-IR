
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.AI_API_KEY;
const BASE_URL =
  process.env.AI_BASE_URL || "https://api.openai.com/v1";
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";

const instructions = `
You are JARVIS.IR, a helpful AI assistant.
Reply in Persian when the user writes Persian.
Reply in English when the user writes English.
Explain things clearly and patiently.
Help with general knowledge, science, math and programming.
Be honest about uncertainty and never invent facts.
`;

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "JARVIS.IR",
    aiConfigured: Boolean(API_KEY)
  });
});

app.post(["/chat", "/ask", "/api/chat"], async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(503).json({
        ok: false,
        error: "AI_API_KEY is not configured."
      });
    }

    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({
        ok: false,
        error: "Message is required."
      });
    }

    const history = Array.isArray(req.body?.history)
      ? req.body.history
          .filter(
            item =>
              ["user", "assistant"].includes(item?.role) &&
              typeof item?.content === "string"
          )
          .slice(-20)
          .map(item => ({
            role: item.role,
            content: item.content.slice(0, 8000)
          }))
      : [];

    const client = new OpenAI({
      apiKey: API_KEY,
      baseURL: BASE_URL
    });

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: instructions },
        ...history,
        { role: "user", content: message }
      ]
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "متأسفم، نتوانستم پاسخی تولید کنم.";

    res.json({ ok: true, reply });
  } catch (error) {
    console.error("AI request failed:", error.message);

    res.status(500).json({
      ok: false,
      error: "AI request failed. Check the server logs."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JARVIS.IR listening on ${PORT}`);
});

