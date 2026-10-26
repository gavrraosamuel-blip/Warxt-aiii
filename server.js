import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static("."));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, personality, history } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Mensagem inválida." });
    }

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{
            text: `Personalidade do personagem: ${
              typeof personality === "string" ? personality.slice(0, 10000) : "Amigável"
            }\n\nHistórico: ${
              typeof history === "string" ? history.slice(-12000) : ""
            }\n\nMensagem do usuário: ${message.slice(0, 10000)}`
          }]
        }
      ]
    });

    res.json({ reply: result.text || "Não consegui responder agora." });
  } catch (error) {
    console.error("Erro ao conversar com Gemini:", error.message);
    res.status(500).json({ error: "Não consegui conectar à IA. Tente novamente." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Warxt AI ativo na porta ${port}`);
});
