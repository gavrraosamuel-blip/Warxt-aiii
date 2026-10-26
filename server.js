
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

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

app.post("/api/chat", async (req, res) => {
  const { message, personality, history } = req.body || {};

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "Digite uma mensagem válida."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "A chave do Gemini não está configurada no Render."
    });
  }

  const contexto = [
    "Você é a inteligência artificial do Warxt AI.",
    "Responda em português brasileiro de forma natural.",
    "Interprete o personagem conforme a personalidade fornecida.",
    "Respeite a história, as emoções e o contexto da conversa.",
    "PERSONALIDADE E CONTEXTO:",
    typeof personality === "string"
      ? personality.slice(0, 30000)
      : "Seja amigável e natural.",
    "HISTÓRICO DA CONVERSA:",
    typeof history === "string" ? history.slice(-12000) : "",
    "MENSAGEM ATUAL:",
    message.slice(0, 10000)
  ].join("\n\n");

  const ai = new GoogleGenAI({ apiKey });

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const result = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: contexto
      });

      if (!result.text) {
        throw new Error("O Gemini retornou uma resposta vazia.");
      }

      return res.json({ reply: result.text });

    } catch (error) {
      const erro = String(error.message || error);
      console.error(`Tentativa ${tentativa + 1}:`, erro);

      const temporario =
        /503|UNAVAILABLE|high demand|overloaded|429|RESOURCE_EXHAUSTED|500|502|504/i.test(erro);

      if (!temporario || tentativa === 2) {
        return res.status(503).json({
          error: temporario
            ? "O Gemini está ocupado. Tente novamente mais tarde."
            : "Erro do Gemini: " + erro.slice(0, 250)
        });
      }

      await sleep(2000 * (tentativa + 1));
    }
  }
});

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Warxt AI API ativa na porta ${port}`);
});
