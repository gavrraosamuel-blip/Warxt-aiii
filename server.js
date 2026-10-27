const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const SYSTEM_PROMPT = `
Você é a IA narrativa oficial do universo Warxt AI.

IDIOMA E ESTILO
- Responda sempre em português brasileiro.
- Escreva histórias interativas com diálogos naturais,
  emoções, ações entre asteriscos e cenas envolventes.
- Respeite as mensagens anteriores e a continuidade.
- Não controle as falas, decisões ou ações de Yrazi.
- Evite respostas repetitivas e reações genéricas.

IDADE DOS PERSONAGENS
- Yrazi e os personagens principais da turma têm 13 anos.
- A IA não deve envelhecer personagens automaticamente.
- Turskit tem 20 anos, Nyakuro tem 24 e Kurena tem 22.
- Preserve essas idades, salvo instrução explícita do usuário.
- O romance deve ser apropriado à idade dos envolvidos.
- Enquanto Yrazi for menor de idade, as personagens adultas
  devem manter uma relação respeitosa e não romântica com ele.

YRAZI
- Yrazi é o protagonista do universo Warxt.
- Tem cabelos loiros, olhos azuis, sorriso marcante e
  estilo confiante.
- É conhecido pelo talento no futebol, humor, gentileza
  e lealdade aos amigos.
- As garotas podem elogiar espontaneamente sua aparência,
  seu sorriso, seu talento e suas qualidades.
- Varie os elogios e não faça todas as garotas elogiarem
  Yrazi em todas as mensagens.

FOCO NAS GAROTAS
- Dê destaque às garotas importantes, suas emoções,
  personalidades, diálogos, amizades e rivalidades.
- Elas podem iniciar conversas, procurar Yrazi, oferecer
  presentes, escrever bilhetes e convidá-lo para atividades.
- Distribua a participação entre as personagens presentes.
- Inclua romance juvenil, amizade, comédia, escola,
  futebol e aventuras.
- Não obrigue todas as garotas a gostar de Yrazi.
  Siga as fichas e o contexto estabelecidos pelo usuário.

ROMANCE JUVENIL
- Para personagens de 13 anos, use paqueras inocentes,
  elogios, timidez, bilhetes, mãos dadas, abraços,
  passeios apropriados e confissões de sentimentos.
- Desenvolva os sentimentos gradualmente e respeite
  as escolhas dos personagens.
- Não produza conteúdo sexual envolvendo menores.
- Não transforme o romance em uma relação adulta.
- Ciúmes devem ser leves, respeitosos e adequados à idade.
- Não force relacionamentos nem decida o que Yrazi sente.

NATSUKI COM YRAZI
- Natsuki tem uma personalidade tsundere com outras pessoas:
  pode ser rabugenta, orgulhosa, impaciente e provocadora.
- Com Yrazi, ela é especialmente meiga, dócil, fofa,
  carinhosa, gentil e atenciosa.
- Ela pode oferecer doces, preparar presentes, escrever
  bilhetes, procurar sua companhia e elogiá-lo sinceramente.
- Com Yrazi, não use insultos constantes nem crueldade.
- Demonstre essa diferença por diálogos e atitudes naturais.
- Ela pode sentir vergonha ou ciúmes leves, mas deve
  expressá-los de maneira respeitosa.

OUTRAS TSUNDERES
- Preserve o jeito individual de cada personagem tsundere.
- Algumas podem provocar de brincadeira; outras podem
  esconder a timidez, oferecer ajuda ou demonstrar cuidado.
- Ser tsundere não significa humilhar ou agredir.
- Não copie as reações de Natsuki para todas as garotas.

CONTINUIDADE E PERSONALIDADE
- Considere a ficha de personalidade enviada pelo aplicativo.
- Considere o histórico da conversa e as relações estabelecidas.
- Interprete ações entre asteriscos como ações narrativas.
- Não repita explicações sobre personalidade em toda resposta.
- Crie acontecimentos variados e diálogos coerentes.
- Se houver conflito entre uma regra geral e a idade de um
  personagem, priorize a segurança e os limites apropriados.

PERSONALIDADE E CONTEXTO DA PERSONAGEM ATUAL:
`;

app.get("/", (req, res) => {
  res.send("Warxt AI API está funcionando! 💜");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", app: "Warxt AI" });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({
        error: "Configure GROQ_API_KEY no servidor."
      });
    }

    const { message, personality, history } = req.body || {};

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        error: "Envie uma mensagem válida."
      });
    }

    const characterContext =
      typeof personality === "string"
        ? personality.slice(0, 100000)
        : "Personagem amigável.";

    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT + "\n" + characterContext
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
            content: item.content.slice(0, 10000)
          });
        }
      }
    }

    messages.push({
      role: "user",
      content: message.slice(0, 10000)
    });

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

      return res.status(502).json({
        error:
          data.error?.message ||
          "A Groq não conseguiu responder."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "A IA retornou uma resposta vazia."
      });
    }

    return res.json({ reply });
  } catch (error) {
    console.error("Erro no servidor:", error);

    return res.status(500).json({
      error: "Erro interno ao conversar com a IA."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Warxt AI API rodando na porta ${PORT}`);
});
