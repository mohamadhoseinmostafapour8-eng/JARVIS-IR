
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسیر واقعی فایل‌های سایت
const FRONTEND_DIR = path.join(
  __dirname,
  "JARVIS_IR_ONLINE_CHATGPT_STYLE"
);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(FRONTEND_DIR));

// تنظیمات OpenAI
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_BASE_URL =
  process.env.AI_BASE_URL || "https://api.openai.com/v1";
const AI_MODEL =
  process.env.AI_MODEL || "gpt-4o-mini";

// شخصیت جارویس
const JARVIS_INSTRUCTIONS = `
تو JARVIS.IR هستی؛ یک دستیار هوشمند، دوستانه و دقیق.

- اگر کاربر فارسی نوشت، فارسی پاسخ بده.
- اگر انگلیسی نوشت، انگلیسی پاسخ بده.
- موضوعات علمی، درسی، فناوری، برنامه‌نویسی و هوش مصنوعی را
  تا جای ممکن ساده و مرحله‌به‌مرحله توضیح بده.
- برای افراد مبتدی، مثال‌های روشن ارائه کن.
- اگر چیزی را نمی‌دانی، صادقانه بگو.
- اطلاعات ساختگی یا ادعای جست‌وجوی اینترنت نداشته باش.
- پیام‌های قبلی همین مکالمه را در نظر بگیر.
- اطلاعات محرمانه و کلیدهای API را افشا نکن.
- با احترام و متناسب با سؤال کاربر پاسخ بده.
`;

// صفحهٔ اصلی سایت
app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

// بررسی وضعیت سرور
app.get("/health", (req, res) => {
  res.json({
    status: "online",
    assistant: "JARVIS.IR",
    aiConfigured: Boolean(AI_API_KEY)
  });
});

// پردازش پیام‌های چت
async function handleChat(req, res) {
  try {
    if (!AI_API_KEY) {
      return res.status(503).json({
        error: "AI_NOT_CONFIGURED",
        reply: "کلید OpenAI در تنظیمات Render تنظیم نشده است."
      });
    }

    const body = req.body || {};
    let messages = [];

    if (Array.isArray(body.messages)) {
      messages = body.messages
        .filter(
          (m) =>
            m &&
            ["user", "assistant"].includes(m.role) &&
            typeof m.content === "string"
        )
        .slice(-20)
        .map((m) => ({
          role: m.role,
          content: m.content.slice(0, 12000)
        }));
    } else {
      const message =
        typeof body.message === "string"
          ? body.message
          : typeof body.text === "string"
            ? body.text
            : "";

      if (message.trim()) {
        messages = [{
          role: "user",
          content: message.slice(0, 12000)
        }];
      }
    }

    if (messages.length === 0) {
      return res.status(400).json({
        error: "EMPTY_MESSAGE",
        reply: "لطفاً یک پیام بنویس."
      });
    }

    const response = await fetch(
      `${AI_BASE_URL.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AI_API_KEY}`
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            {
              role: "system",
              content: JARVIS_INSTRUCTIONS
            },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 1200
        }),
        signal: AbortSignal.timeout(60000)
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(
        "OpenAI API error:",
        response.status,
        JSON.stringify(data).slice(0, 1500)
      );

      return res.status(502).json({
        error: "AI_PROVIDER_ERROR",
        reply:
          "اتصال به OpenAI موفق نشد. کلید، دسترسی مدل، " +
          "اعتبار API و گزارش‌های Render را بررسی کن."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "EMPTY_AI_RESPONSE",
        reply: "پاسخی دریافت نشد؛ لطفاً دوباره تلاش کن."
      });
    }

    return res.json({
      reply: reply.trim(),
      assistant: "JARVIS.IR"
    });

  } catch (error) {
    console.error("Chat error:", error.message);

    return res.status(500).json({
      error: "SERVER_ERROR",
      reply: "خطایی در سرور رخ داد. لطفاً دوباره تلاش کن."
    });
  }
}

// مسیرهای چت
app.post("/api/chat", handleChat);
app.post("/chat", handleChat);

// خطاهای مسیرهای ناشناخته
app.use((req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    reply: "این آدرس در JARVIS.IR وجود ندارد."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JARVIS.IR listening on ${PORT}`);
});

