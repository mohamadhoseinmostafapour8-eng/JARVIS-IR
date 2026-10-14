JARVIS.IR - نسخه آنلاین و قابل نصب

این نسخه یک سرور واحد برای سایت و API دارد و مسیرهای /chat و /ask و /api/chat را پشتیبانی می‌کند.
برای آنلاین شدن، پروژه را روی یک هاست Node/Express قرار بده و OPENAI_API_KEY را فقط در بخش Environment/Secrets هاست تنظیم کن.

اجرای محلی:
npm install
npm start
سپس http://localhost:3000

تست:
http://localhost:3000/health

برای نصب روی گوشی، وقتی سایت روی HTTPS آنلاین شد، از گزینه Install/Add to Home Screen مرورگر استفاده کن.

کلید API را داخل index.html یا فایل‌های عمومی قرار نده.
