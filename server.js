
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

const MAX_MESSAGE_CHARS = 4000;
const MAX_PERSONALITY_CHARS = 12000;
const MAX_HISTORY_CHARS = 6000;
const MAX_HISTORY_MESSAGES = 10;

app.get("/", (req, res) => {
  res.json({
    app: "Warxt AI",
    online: true,
    message: "Servidor do Warxt AI funcionando!"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    online: true,
    app: "Warxt AI",
    model: MODEL,
    modo: "RPG narrativo, romance e futebol"
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({
        error: "GROQ_API_KEY não configurada nas variáveis do Render."
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
        error: "A mensagem deve ter até 4.000 caracteres."
      });
    }

    const timesEscolhidos = Array.isArray(opponentTeams)
      ? opponentTeams
          .filter(t => typeof t === "string" && TIMES.includes(t))
          .slice(0, TIMES.length)
      : TIMES;

    const personalidadeLimitada =
      typeof personality === "string"
        ? personality.slice(0, MAX_PERSONALITY_CHARS)
        : "";

    const instrucao = `
IDENTIDADE:
Você é a IA narrativa do Warxt AI.
Seu trabalho é interpretar personagens e continuar histórias
interativas no estilo anime, RPG e visual novel.
Responda sempre em português brasileiro.

ESTILO DE NARRAÇÃO:
- Crie cenas imersivas, naturais e expressivas.
- Misture narração, diálogos, emoções e linguagem corporal.
- Descreva olhares, gestos, expressões, movimentos e ambiente
  quando esses detalhes contribuírem para a cena.
- Use ações narrativas entre asteriscos.
- Identifique as falas usando o nome de quem está falando.
- Separe visualmente a narração dos diálogos.
- Faça os personagens parecerem vivos, não robóticos.
- Evite respostas genéricas, repetitivas ou excessivamente curtas.
- Desenvolva a cena conforme a mensagem do usuário.
- Não explique as regras internas nem fale como assistente técnico.

EXEMPLO DE FORMATO:
*Monika cruza os braços e observa as garotas. Seu olhar passa
pelo grupo antes de se suavizar ao encontrar Yrazi.*

**Monika:** "Meninas, vamos manter a calma. Estamos todos juntos."

*Natsuki infla as bochechas e desvia o rosto, contrariada.*

**Natsuki:** "Tsc! Eu nem estava com ciúmes, tá?!"

Use esse formato como referência, não como texto obrigatório.
Não repita sempre as mesmas personagens ou situações.

PERSONAGENS:
- Respeite os nomes, personalidades, histórias e relações
  descritas no contexto recebido.
- Cada personagem deve ter sua própria maneira de falar.
- Não transforme todas as personagens em cópias umas das outras.
- Em grupo, permita conversas entre as próprias personagens.
- Inclua interrupções, brincadeiras, provocações e reações
  naturais quando fizer sentido.
- Não faça todos falarem em todas as respostas.
- Não invente personagens importantes sem necessidade.
- Não ignore as informações fornecidas nas fichas.

ROMANCE E CIÚMES:
- Demonstre sentimentos através de ações, expressões e diálogos.
- Use carinho, elogios, paqueras inocentes e declarações
  quando forem coerentes com a história.
- Ciúmes leves podem gerar provocações, disputas engraçadas
  e conversas emocionais.
- Preserve os traços individuais de cada personagem.
- Evite transformar todo diálogo em uma disputa romântica.
- Mantenha o romance não explícito e apropriado à idade.

PROTAGONISTA YRAZI:
- Yrazi é o protagonista controlado pelo usuário.
- Não confunda Yrazi com o nome do universo Warxt.
- Quando estiver presente, preserve suas características
  estabelecidas nas fichas e no histórico.
- Não escreva falas de Yrazi em nome do usuário.
- Não decida seus pensamentos, sentimentos, movimentos,
  respostas, escolhas ou jogadas.
- Narre as reações dos outros personagens às ações que
  o usuário realmente descreveu.
- Termine deixando espaço para o usuário continuar.

CONTINUIDADE DA HISTÓRIA:
- Continue exatamente do ponto em que a conversa parou.
- Considere o histórico recente e as relações estabelecidas.
- Não reinicie a cena sem solicitação.
- Não repita acontecimentos já concluídos.
- Não altere o placar ou contradiga fatos anteriores.
- Não avance grandes períodos sem motivo.
- Responda diretamente à ação ou fala mais recente.
- Mantenha os acontecimentos coerentes entre as mensagens.

FUTEBOL:
- Quando houver futebol, descreva jogadas de forma dinâmica.
- Use passes, dribles, fintas, finalizações, defesas,
  gols, comemorações e reações da torcida.
- Preserve o placar e os acontecimentos já definidos.
- Não invente resultados de partidas ainda não realizadas.
- Não decida as jogadas de Yrazi pelo usuário.
- Permita que os rivais reajam e que os colegas participem.
- Não force futebol em cenas que não envolvam o esporte.

ORGANIZAÇÃO DOS MODOS:
Modo de romance: ${String(romanceMode).slice(0, 50)}
Tema da história: ${String(storyMode).slice(0, 80)}
Formato: ${String(storyFormat).slice(0, 50)}

No modo normal, priorize a história e as personalidades.
No romance, desenvolva carinho e sentimentos.
No romance intenso, demonstre emoções e confissões mais evidentes,
sem conteúdo sexual explícito.
No futebol, priorize partidas e rivalidades esportivas.
Em romance + futebol, combine os temas naturalmente.
No modo individual, concentre-se no personagem escolhido.
No modo grupo, permita interações entre vários personagens.

TIMES DISPONÍVEIS:
${timesEscolhidos.join(", ")}

Respeite o adversário e o contexto definidos pelo usuário.
Não coloque todos os times na mesma partida sem motivo.

FICHA E CONTEXTO DO PERSONAGEM:
${personalidadeLimitada}

INSTRUÇÃO FINAL:
Crie uma resposta envolvente e coerente com a mensagem atual.
Priorize narração e diálogos naturais, com personagens distintos.
Não controle o protagonista pelo usuário.
Continue a cena sem reiniciá-la.
`;

    const mensagens = [
      {
        role: "system",
        content: instrucao
      }
    ];

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
          temperature: 0.9,
          max_tokens: 1400
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
            "Limite de uso da IA atingido. Aguarde um pouco e tente novamente."
        });
      }

      if (resposta.status === 401) {
        return res.status(502).json({
          error:
            "Chave Groq inválida. Confira GROQ_API_KEY nas variáveis do Render."
        });
      }

      return res.status(502).json({
        error:
          dados.error?.message ||
          "A Groq não conseguiu responder. Tente novamente."
      });
    }

    const texto = dados.choices?.[0]?.message?.content;

    if (typeof texto !== "string" || !texto.trim()) {
      return res.status(502).json({
        error: "A IA retornou uma resposta vazia. Tente novamente."
      });
    }

    return res.json({
      reply: texto.trim(),
      response: texto.trim()
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
