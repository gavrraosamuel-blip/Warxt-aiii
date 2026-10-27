
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL =
  process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

app.get("/", (req, res) => {
  res.send("Warxt AI API está funcionando! 💜");
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({
        error: "Configure GROQ_API_KEY no servidor."
      });
    }

    const { message, personality, history } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Envie uma mensagem válida."
      });
    }

    const messages = [
      {
        role: "system",
        content:
          "Você é um personagem fictício do Warxt AI. " +
          "Responda em português brasileiro, respeite a personalidade, " +
          "a história e o contexto fornecidos. Interprete ações entre " +
          "asteriscos como ações narrativas. Seja natural e coerente.\n\n" +
          "Personalidade e contexto do personagem:\n" +
          String(personality || "Personagem amigável.")
      }
    ];

    if (Array.isArray(history)) {
      for (const item of history.slice(-30)) {
        if (
          item &&
          ["user", "assistant"].includes(item.role) &&
          typeof item.content === "string"
        ) {
          messages.push({
            role: item.role,
            content: item.content
          });
        }
      }
    }

    messages.push({ role: "user", content: message });

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.8,
          max_tokens: 1000
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro Groq:", data);
      return res.status(response.status).json({
        error: "A Groq não conseguiu responder. Verifique o servidor."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({
        error: "A IA retornou uma resposta vazia."
      });
    }

    res.json({ reply });
  } catch (error) {
    console.error("Erro no servidor:", error);
    res.status(500).json({
      error: "Erro interno ao conversar com a IA."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Warxt AI API rodando na porta ${PORT}`);
});
