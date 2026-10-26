
import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
const SITE_URL = "https://warxt-aiii.onrender.com";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", SITE_URL);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.send("Warxt AI API está funcionando!");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "online" });
});

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

app.post("/api/chat", async (req, res) => {
  const { message, personality, history } = req.body || {};

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "Digite uma mensagem válida."
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "A chave do Gemini não está configurada no Render."
    });
  }

  const contexto = [
    "Interprete o personagem descrito abaixo.",
    "Responda em português brasileiro de forma natural.",
    "Respeite a personalidade e a história do personagem.",
    "PERSONALIDADE E CONTEXTO:",
    typeof personality === "string"
      ? personality.slice(0, 30000)
      : "Seja amigável e natural.",
    "HISTÓRICO:",
    typeof history === "string" ? history.slice(-12000) : "",
    "MENSAGEM ATUAL:",
    message.slice(0, 10000)
  ].join("\n\n");

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const result = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: contexto
      });

      if (!result.text) {
        throw new Error("O Gemini retornou uma resposta vazia.");
      }

      return res.json({ reply: result.text });

    } catch (error) {
      const mensagem = String(error.message || error);
      console.error(`Tentativa ${tentativa + 1}:`, mensagem);

      const temporario =
        /503|UNAVAILABLE|overloaded|high demand|429|RESOURCE_EXHAUSTED|500|502|504/.test(
          mensagem
        );

      if (!temporario || tentativa === 2) {
        return res.status(503).json({
          error: temporario
            ? "O Gemini continua ocupado. Aguarde um pouco e tente novamente."
            : "Erro do Gemini: " + mensagem.slice(0, 300)
        });
      }

      await sleep(1500 * Math.pow(2, tentativa));
    }
  }
});

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Warxt AI API ativa na porta ${port}`);
});

