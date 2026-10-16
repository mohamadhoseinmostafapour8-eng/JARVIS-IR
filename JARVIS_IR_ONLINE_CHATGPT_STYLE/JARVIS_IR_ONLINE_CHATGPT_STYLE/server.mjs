import express from "express";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const app=express();
app.use(express.json({limit:"2mb"}));
app.use(express.static(__dirname));
const PORT=Number(process.env.PORT||3000);
app.get("/health",(_req,res)=>res.json({ok:true,service:"JARVIS.IR",mode:"free-basic"}));
app.post(["/chat","/ask","/api/chat"],(_req,res)=>res.json({ok:true,reply:"این نسخهٔ رایگان پاسخ‌های ساده را در مرورگر تولید می‌کند. لطفاً صفحه را تازه‌سازی کنید و از چت استفاده کنید."}));
app.listen(PORT,"0.0.0.0",()=>console.log(`JARVIS.IR free mode listening on ${PORT}`));
