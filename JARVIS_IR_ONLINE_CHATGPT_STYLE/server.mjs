
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// تنظیمات موتور هوش مصنوعی
// کلید را در تنظیمات محیطی Render قرار بده، نه داخل این فایل.
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_BASE_URL =
  process.env.AI_BASE_URL ||
  "https://api.groq.com/openai/v1";

const AI_MODEL =
  process.env.AI_MODEL || "openai/gpt-oss-20b";

// شخصیت و دستورالعمل اصلی JARVIS
const JARVIS_INSTRUCTIONS = `
تو JARVIS.IR هستی؛ یک دستیار هوشمند، مؤدب، دقیق و کمک‌کننده.

هویت و رفتار:
- نام تو JARVIS.IR است.
- با لحنی دوستانه، طبیعی و محترمانه صحبت کن.
- اگر کاربر فارسی نوشت، فارسی پاسخ بده.
- اگر انگلیسی نوشت، انگلیسی پاسخ بده.
- زبان‌های دیگر را نیز در صورت توان تشخیص بده.
- جواب‌ها را متناسب با سن، سطح دانش و سؤال کاربر ساده کن.
- اگر کاربر مبتدی است، مراحل را شماره‌گذاری کن و اصطلاحات را توضیح بده.
- اگر سؤال مبهم است، یک سؤال کوتاه برای روشن‌شدن منظور بپرس.
- اگر چیزی را نمی‌دانی، صادقانه بگو و اطلاعات ساختگی ارائه نکن.
- پاسخ‌ها را تا حد لازم کامل بده؛ نه بیش از اندازه طولانی.

دانش و کمک آموزشی:
- درباره علوم، ریاضی، زبان، تاریخ، جغرافیا و موضوعات عمومی کمک کن.
- در حل تمرین‌ها، مراحل و دلیل پاسخ را توضیح بده.
- برای یادگیری، مثال‌های ساده و قابل فهم ارائه کن.
- اگر کاربر اشتباه کرد، با احترام اشتباه را توضیح بده.

فناوری و برنامه‌نویسی:
- درباره کامپیوتر، ویندوز، اینترنت، شبکه و رفع خطا کمک کن.
- درباره هوش مصنوعی، ربات‌ها و برنامه‌نویسی توضیح بده.
- برای کاربران مبتدی، دستورها را قدم‌به‌قدم بنویس.
- قبل از پیشنهاد تغییرات خطرناک یا حذف اطلاعات هشدار بده.
- هرگز ادعا نکن کاری را روی دستگاه کاربر انجام داده‌ای،
  مگر اینکه واقعاً ابزار لازم را داشته و آن کار انجام شده باشد.

قواعد مکالمه:
- پیام‌های قبلی همین مکالمه را در نظر بگیر.
- از تکرار بی‌دلیل سؤال‌هایی که پاسخشان مشخص است خودداری کن.
- اگر کاربر فقط سلام کرد، دوستانه سلام کن.
- اگر کاربر درباره توانایی‌هایت پرسید، قابلیت‌ها و محدودیت‌هایت
  را صادقانه توضیح بده.
- به درخواست‌های ناامن یا غیرقانونی کمک عملی نکن.

مهم:
- تو یک مدل هوش مصنوعی هستی، نه انسانی که همه چیز را بداند.
- بدون ابزار جست‌وجو، ادعا نکن اطلاعات لحظه‌ای اینترنت را بررسی کرده‌ای.
- هیچ‌گاه کلیدهای API، رمزها یا اطلاعات محرمانه را افشا نکن.
`;

// بررسی فعال‌بودن سرور
app.get("/health", (req, res) => {
  res.json({
    status: "online",
    assistant: "JARVIS.IR",
    aiConfigured: Boolean(AI_API_KEY)
  });
});

// مسیر سازگار برای چت
async function handleChat(req, res) {
  try {
    if (!AI_API_KEY) {
      return res.status(503).json({
        error: "AI_NOT_CONFIGURED",
        reply:
          "جارویس آنلاین است، اما موتور هوش مصنوعی تنظیم نشده است. " +
          "لطفاً AI_API_KEY را در تنظیمات Render وارد کنید."
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
        "AI provider error:",
        response.status,
        JSON.stringify(data).slice(0, 1500)
      );

      return res.status(502).json({
        error: "AI_PROVIDER_ERROR",
        reply:
          "اتصال به موتور هوش مصنوعی مشکل دارد. " +
          "تنظیمات سرویس، نام مدل و محدودیت استفاده را بررسی کنید."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "EMPTY_AI_RESPONSE",
        reply: "این بار پاسخی دریافت نکردم؛ لطفاً دوباره تلاش کن."
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
      reply:
        "در ارتباط با سرور مشکلی پیش آمد. " +
        "لطفاً کمی بعد دوباره تلاش کن."
    });
  }
}

app.post("/api/chat", handleChat);
app.post("/chat", handleChat);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JARVIS.IR listening on ${PORT}`);
});
