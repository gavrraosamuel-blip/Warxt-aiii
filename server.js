
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const TIMES = [
  "Pé de Pano",
  "Read FC",
  "Vakan",
  "Sharks FC",
  "Estudiantes",
  "Barsemlona",
  "Real Madruga",
  "Bayern B",
  "Milan B",
  "Real Madrid B",
  "United B",
  "Barcelona B",
  "Santo Olímpico",
  "Mentalistas",
  "The Gold",
  "Formiga Cabeçuda",
  "zHtml",
  "Bourt"
];

// Limites para reduzir o consumo de tokens por solicitação.
const MAX_MESSAGE_CHARS = 4000;
const MAX_PERSONALITY_CHARS = 5000;
const MAX_HISTORY_CHARS = 4500;
const MAX_HISTORY_MESSAGES = 8;

app.get("/api/health", (req, res) => {
  res.json({
    online: true,
    app: "Warxt AI",
    modo: "Romance + Futebol — História em Grupo"
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({
        error: "A chave GROQ_API_KEY não foi configurada no servidor."
      });
    }

    const {
      message,
      personality = "",
      history = [],
      romanceMode = "intenso",
      storyMode = "romance_futebol",
      storyFormat = "grupo",
      opponentTeams = TIMES
    } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Digite uma mensagem antes de enviar."
      });
    }

    if (message.length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({
        error: "Sua mensagem é muito longa. Tente usar até 4.000 caracteres."
      });
    }

    const timesEscolhidos = Array.isArray(opponentTeams)
      ? opponentTeams
          .filter(t => typeof t === "string" && TIMES.includes(t))
          .slice(0, TIMES.length)
      : TIMES;

    // Limita a personalidade enviada à API.
    // O conteúdo original continua salvo no aplicativo.
    const personalidadeLimitada =
      typeof personality === "string"
        ? personality.slice(0, MAX_PERSONALITY_CHARS)
        : "";

    const instrucao = `
Você é a inteligência narrativa do Warxt AI.
Responda em português brasileiro natural.

UNIVERSO: Yrazi é o protagonista controlado pelo usuário.
Não confunda Yrazi com o nome do universo Warxt.

REGRAS:
- Misture futebol e romance naturalmente, conforme a cena.
- Mantenha a continuidade da história, partidas e relacionamentos.
- Narre dribles, passes, gols, defesas e comemorações quando fizer sentido.
- Inclua diálogos, emoções, reações e carinho apropriado à idade.
- Respeite a personalidade e o histórico de cada personagem.
- Use ações entre asteriscos quando combinarem com a narrativa.
- Nunca decida as falas, escolhas ou ações de Yrazi pelo usuário.
- Não invente resultados de partidas ainda não realizadas.
- Não force futebol ou romance em todas as mensagens.
- Continue a cena a partir da mensagem mais recente.

TIMES:
${timesEscolhidos.join(", ")}

Respeite o adversário escolhido pelo usuário.
Não coloque todos os times na mesma partida sem motivo.

MODO DE ROMANCE: ${String(romanceMode).slice(0, 50)}
MODO DA HISTÓRIA: ${String(storyMode).slice(0, 80)}
FORMATO: ${String(storyFormat).slice(0, 50)}

PERSONALIDADE E CONTEXTO:
${personalidadeLimitada}

Priorize a mensagem atual e mantenha respostas naturais.
`;

    const mensagens = [
      {
        role: "system",
        content: instrucao
      }
    ];

    // Seleciona as mensagens mais recentes respeitando
    // um limite total de caracteres para o histórico.
    const historicoValido = Array.isArray(history)
      ? history.filter(item =>
          item &&
          ["user", "assistant"].includes(item.role) &&
          typeof item.content === "string"
        )
      : [];

    const recentes = [];
    let caracteresHistorico = 0;

    for (
      let i = historicoValido.length - 1;
      i >= 0 && recentes.length < MAX_HISTORY_MESSAGES;
      i--
    ) {
      const item = historicoValido[i];
      const restante = MAX_HISTORY_CHARS - caracteresHistorico;

      if (restante <= 0) break;

      const conteudo = item.content.slice(
        -Math.min(1500, restante)
      );

      if (!conteudo.trim()) continue;

      recentes.unshift({
        role: item.role,
        content: conteudo
      });

      caracteresHistorico += conteudo.length;
    }

    mensagens.push(...recentes);

    mensagens.push({
      role: "user",
      content: message.trim()
    });

    const resposta = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: mensagens,
          temperature: 0.85,
          max_tokens: 900
        })
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      console.error("Erro da Groq:", resposta.status, dados);

      if (
        resposta.status === 429 ||
        dados.error?.code === "rate_limit_exceeded"
      ) {
        return res.status(429).json({
          error:
            "O limite de uso da IA foi atingido. Aguarde um pouco e tente novamente com uma mensagem menor."
        });
      }

      if (resposta.status === 401) {
        return res.status(502).json({
          error:
            "A chave da Groq é inválida. Confira GROQ_API_KEY nas variáveis do Render."
        });
      }

      return res.status(502).json({
        error: "A Groq não conseguiu responder. Tente novamente."
      });
    }

    const texto = dados.choices?.[0]?.message?.content;

    if (!texto) {
      return res.status(502).json({
        error: "A IA retornou uma resposta vazia. Tente novamente."
      });
    }

    return res.json({
      reply: texto,
      response: texto
    });

  } catch (erro) {
    console.error("Erro interno:", erro.message);

    return res.status(500).json({
      error: "Erro interno no servidor. Tente novamente."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Warxt AI ativo na porta ${PORT}`);
});
