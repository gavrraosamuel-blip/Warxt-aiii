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

    if (message.length > 12000) {
      return res.status(400).json({
        error: "A mensagem é muito longa. Envie uma mensagem menor."
      });
    }

    const timesEscolhidos = Array.isArray(opponentTeams)
      ? opponentTeams
          .filter(t => typeof t === "string" && TIMES.includes(t))
          .slice(0, TIMES.length)
      : TIMES;

    const instrucao = `
Você é a inteligência narrativa do Warxt AI.
Responda sempre em português brasileiro natural.

MODO FIXO: ROMANCE + FUTEBOL — HISTÓRIA EM GRUPO.

REGRAS DA HISTÓRIA:
- Misture futebol e romance na mesma história, sem separar em modos.
- Mantenha a continuidade dos acontecimentos, partidas e relacionamentos.
- Narre treinos, campeonatos, dribles, passes, gols, defesas,
  placares, rivalidades e comemorações quando fizer sentido.
- Inclua diálogos, emoções, reações e momentos carinhosos apropriados.
- Faça os personagens conversarem entre si quando a cena pedir.
- Respeite a personalidade e a história de cada personagem.
- Use ações entre asteriscos quando combinarem com a narrativa.
- Não controle as falas, escolhas ou ações do protagonista do usuário.
- Não invente que uma partida já aconteceu se ainda não aconteceu.
- Não force futebol em toda mensagem; acompanhe o contexto da conversa.
- Mantenha o romance leve, respeitoso e apropriado à idade dos personagens.

TIMES DISPONÍVEIS PARA CONFRONTOS:
${timesEscolhidos.join(", ")}

Use esses times para organizar confrontos e campeonatos.
Não precisa colocar todos na mesma partida.
Se o usuário escolher um adversário específico, respeite essa escolha.

MODO DE ROMANCE: ${romanceMode}
MODO DA HISTÓRIA: ${storyMode}
FORMATO: ${storyFormat}

PERSONALIDADE E CONTEXTO DO PERSONAGEM:
${String(personality).slice(0, 100000)}

A mensagem do usuário e o histórico definem a cena atual.
Continue naturalmente a partir deles.
`;

    const mensagens = [
      {
        role: "system",
        content: instrucao
      }
    ];

    if (Array.isArray(history)) {
      for (const item of history.slice(-30)) {
        if (
          item &&
          ["user", "assistant"].includes(item.role) &&
          typeof item.content === "string"
        ) {
          mensagens.push({
            role: item.role,
            content: item.content.slice(0, 12000)
          });
        }
      }
    }

    mensagens.push({
      role: "user",
      content: message.trim()
    });

    const resposta = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: mensagens,
          temperature: 0.85,
          max_tokens: 1200
        })
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      console.error("Erro da Groq:", resposta.status, dados);

      return res.status(502).json({
        error: resposta.status === 401
          ? "A chave da Groq é inválida. Confira a variável GROQ_API_KEY."
          : "A Groq não conseguiu responder. Tente novamente."
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
