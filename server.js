
import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();

const SITE_URL = "https://warxt-aiii.onrender.com";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", SITE_URL);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.send("Servidor do Warxt AI está funcionando!");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "online" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, personality, history } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Digite uma mensagem válida."
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY não configurada.");

      return res.status(500).json({
        error: "A chave do Gemini não está configurada no servidor."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const contexto = [
      "Você interpreta o personagem descrito abaixo.",
      "Responda em português brasileiro, naturalmente.",
      "Respeite a personalidade, a história e o contexto.",
      "Personalidade e contexto:",
      typeof personality === "string"
        ? personality.slice(0, 30000)
        : "Seja amigável e natural.",
      "Histórico da conversa:",
      typeof history === "string"
        ? history.slice(-12000)
        : "",
      "Mensagem atual do usuário:",
      message.slice(0, 10000)
    ].join("\n\n");

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contexto
    });

    const reply = result.text;

    if (!reply) {
      throw new Error("O Gemini retornou uma resposta vazia.");
    }

    return res.json({ reply });

  } catch (error) {
    console.error(
      "Erro na API do Warxt AI:",
      error.message
    );

    return res.status(500).json({
      error: "Falha ao gerar resposta. Confira os logs do servidor."
    });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Warxt AI API ativa na porta ${port}`);
});
