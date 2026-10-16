import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

const PORT = Number(process.env.PORT || 3000);

function getReply(message) {
  const text = message.toLowerCase().trim();

  if (text.includes("سلام") || text.includes("درود") ||
      text.includes("hello") || text.includes("hi")) {
    return "سلام! من جارویس هستم! 🤖 چطور می‌تونم کمکت کنم؟";
  }

  if (text.includes("اسمت") || text.includes("نامت") ||
      text.includes("who are you")) {
    return "من JARVIS.IR هستم؛ دستیار سادهٔ تو!";
  }

  if (text.includes("خوبی") || text.includes("how are you")) {
    return "ممنون! آماده‌ام کمکت کنم. 😊";
  }

  if (text.includes("ممنون") || text.includes("مرسی") ||
      text.includes("thank")) {
    return "خواهش می‌کنم! 💙";
  }

  if (text.includes("خداحافظ") || text.includes("bye")) {
    return "خداحافظ! 👋";
  }

  return "من در حالت رایگان ساده هستم و هنوز پاسخ این سؤال رو بلد نیستم.";
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "JARVIS.IR", mode: "free-basic" });
});

app.post(["/chat", "/ask", "/api/chat"], (req, res) => {
  const messages = req.body?.messages;
  const last = Array.isArray(messages)
    ? [...messages].reverse().find(
        m => m?.role === "user" && typeof m.content === "string"
      )
    : null;

  if (!last || !last.content.trim()) {
    return res.status(400).json({ ok: false, error: "Please enter a message." });
  }

  const reply = getReply(last.content);
  res.json({ ok: true, reply, answer: reply });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JARVIS.IR free mode listening on ${PORT}`);
});
