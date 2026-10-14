import express from "express";
import path from "node:path";
import {fileURLToPath} from "node:url";
import OpenAI from "openai";

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const app=express();
app.use(express.json({limit:"2mb"}));
app.use(express.static(__dirname));

const PORT=Number(process.env.PORT||3000);
const MODEL=process.env.OPENAI_MODEL||"gpt-5.6-luna";

function getClient(){
  if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({apiKey:process.env.OPENAI_API_KEY});
}
function clean(messages){
  return Array.isArray(messages)
    ? messages.filter(m=>m&&(m.role==="user"||m.role==="assistant")&&typeof m.content==="string")
      .map(m=>({role:m.role,content:m.content.trim()})).filter(m=>m.content).slice(-40)
    : [];
}
async function chat(req,res){
  try{
    const messages=clean(req.body?.messages);
    if(!messages.length) throw new Error("No valid messages.");
    const r=await getClient().responses.create({
      model:MODEL,
      instructions:"You are JARVIS, a helpful AI assistant. Be accurate, friendly and concise. Answer in the user's language when possible. If current information is needed, use web search. Do not claim to have done actions you did not do.",
      input:messages,
      tools:[{type:"web_search"}]
    });
    res.json({ok:true,reply:r.output_text||"پاسخی دریافت نشد.",answer:r.output_text||"پاسخی دریافت نشد."});
  }catch(e){
    console.error(e);
    res.status(500).json({ok:false,error:e.message||"AI request failed"});
  }
}
app.get("/health",(_req,res)=>res.json({ok:true,service:"JARVIS.IR",model:MODEL}));
app.post("/chat",chat);
app.post("/ask",chat);
app.post("/api/chat",chat);
app.listen(PORT,"0.0.0.0",()=>console.log(`JARVIS.IR listening on ${PORT}`));
