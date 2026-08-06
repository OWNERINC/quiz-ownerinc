# Quiz de afinidade Owntime e Nest

## Contexto

O produto sera uma experiencia editorial da Ownerinc para leads em descoberta.
Depois de cinco escolhas, o site apresenta o empreendimento com maior afinidade
ao estilo de vida indicado pelas respostas. O resultado nao constitui
recomendacao financeira, comercial ou juridica.

As referencias documentais sao as notas canonicas `Owntime.md`, `Nest.md` e
`Ownerinc.md`, acompanhadas de seus arquivos `Validacao.md`. Os sites
`ownerinc.com.br` e `owntime.com.br` sao referencias de composicao e atmosfera,
nao fontes automaticas para claims de produto.

## Objetivos

- ajudar o visitante a reconhecer diferencas de estilo entre Owntime e Nest;
- entregar o resultado antes de pedir dados pessoais;
- converter interesse em contato voluntario com um especialista;
- funcionar primeiro em celulares e adaptar-se a telas maiores;
- manter linguagem de afinidade, sem afirmar qual produto e objetivamente melhor.

## Fora do escopo

- simulacao financeira, precos ou comparacao de investimento;
- autenticacao, area do cliente ou persistencia das respostas;
- painel administrativo;
- recomendacao gerada por IA;
- envio de dados pessoais ou respostas para analytics.

## Jornada

1. Abertura cinematografica com a marca Ownerinc e uma chamada sobre formas de
   viver Gramado.
2. O visitante inicia o quiz sem informar dados pessoais.
3. Cada uma das cinco telas mostra uma pergunta, duas respostas, progresso
   textual e segmentado, alem dos controles Voltar e Continuar.
4. Continuar permanece indisponivel ate existir uma resposta selecionada.
5. Voltar preserva as escolhas feitas na sessao atual e, na primeira pergunta,
   retorna a abertura.
6. A quinta resposta inicia a revelacao cinematografica do resultado.
7. O resultado mostra somente Owntime ou Nest Mountain Lodge como afinidade
   editorial, seguido do CTA "Falar com a equipe Ownerinc".
8. O CTA abre no proprio resultado o formulario com nome, WhatsApp, e-mail e
   aceite obrigatorio para contato, acompanhado do link da politica de
   privacidade.
9. O cadastro so e confirmado quando o webhook responde com sucesso.
10. A confirmacao mantem disponivel um link oficial para conhecer o resultado.

## Perguntas

### 1. Acomodacao

**Pergunta:** Quando imagina sua estadia em Gramado, qual configuracao mais
combina com voce?

- **A, Owntime:** A amplitude e a sensacao de casa, com ambientes pensados para
  reunir diferentes geracoes.
- **B, Nest:** A praticidade de um apartamento contemporaneo, integrado a
  atmosfera de um Mountain Lodge.

### 2. Atmosfera

**Pergunta:** Qual atmosfera voce prefere encontrar ao chegar?

- **A, Owntime:** Um refugio conectado ao bosque, com natureza e convivencia
  marcando o ritmo dos dias.
- **B, Nest:** Um refugio de montanha organico e intimista, voltado ao conforto
  sensorial e a contemplacao.

### 3. Ritmo de convivencia

**Pergunta:** Qual ritmo de convivencia mais combina com voce?

- **A, Owntime:** Alternar momentos em familia com experiencias compartilhadas e
  atividades para diferentes idades.
- **B, Nest:** Equilibrar momentos de lazer com pausas de autocuidado, silencio e
  bem-estar.

### 4. Localizacao

**Pergunta:** Que relacao com Gramado voce deseja viver?

- **A, Owntime:** Sentir-se em meio a natureza, mantendo acesso as experiencias
  da cidade.
- **B, Nest:** Estar proximo a vida urbana, preservando a relacao com a paisagem
  e o vale.

### 5. Experiencia desejada

**Pergunta:** Qual experiencia voce mais deseja levar das suas ferias?

- **A, Owntime:** Criar memorias em familia, com espaco, acolhimento e tempo para
  estar junto.
- **B, Nest:** Desacelerar em uma experiencia contemporanea, sensorial e
  contemplativa.

## Pontuacao e resultados

Cada resposta A soma um ponto para Owntime. Cada resposta B soma um ponto para
Nest. Todas as cinco perguntas sao obrigatorias.

- `5-0`, `4-1` ou `3-2`: resultado unico para o empreendimento com mais pontos.

Textos aprovados:

- **Owntime:** "Suas respostas indicam maior afinidade editorial com o Owntime,
  um caminho para conhecer uma proposta ligada a espaco, natureza e
  convivencia."
- **Nest:** "Suas respostas indicam maior afinidade editorial com o Nest Mountain
  Lodge, um caminho para conhecer uma proposta ligada a arquitetura, bem-estar e
  contemplacao."

O site usa sempre os termos `afinidade`, `perfil` ou `combina`. Nao usa
`melhor investimento`, `escolha certa`, garantia de adequacao ou promessa de
resultado.

## Direcao visual

### Base neutra

A abertura e o quiz usam a identidade Ownerinc como camada neutra:

- fundo carvao;
- texto branco ou off-white;
- bronze como unico acento;
- composicao editorial, fotografias amplas e bastante espaco negativo;
- tipografia oficial Novelin quando os arquivos licenciados estiverem
  disponiveis; uma fonte de sistema legivel e declarada como fallback;
- Signaturia somente em um detalhe expressivo, nunca em textos funcionais.

As perguntas nao usam fotografias dos empreendimentos, evitando induzir a
escolha. As respostas sao controles grandes, com estados normal, hover, foco e
selecionado claramente distintos.

### Resultado cinematografico

Depois da quinta resposta, a interface escurece brevemente. A fotografia do
resultado entra por mascara vertical e com leve ampliacao. Fundo, arquitetura e
primeiro plano se deslocam em velocidades diferentes para criar profundidade. O
nome, a frase e o CTA entram em sequencia curta.

O primeiro trecho de rolagem continua o parallax sem mover o texto para fora da
area legivel. O formulario aparece imediatamente abaixo da cena. O efeito nao
deve atrasar nem bloquear o CTA.

- Enquanto os assets e MIVs de produto nao estiverem aprovados, ambos os
  resultados permanecem no sistema visual neutro da Ownerinc.
- A identidade especifica de Owntime ou Nest so entra depois da aprovacao dos
  logos, fotografias e regras visuais correspondentes.

Somente logos oficiais e fotografias aprovadas podem representar os produtos.
Renders devem ser identificados como imagens ilustrativas quando essa informacao
for aplicavel.

## Mobile first e responsividade

O CSS parte da menor tela suportada e adiciona complexidade em breakpoints
progressivos. A mesma estrutura semantica atende celular e desktop, sem duplicar
o DOM.

- uma pergunta por viewport sempre que a altura disponivel permitir;
- alvos interativos de no minimo 48 por 48 pixels;
- formulario em coluna unica no celular;
- texto fluido com limites de tamanho legiveis;
- parallax com menor amplitude e menos camadas em dispositivos moveis;
- desktop amplia espaco negativo, escala tipografica e profundidade sem alterar
  a ordem da jornada;
- orientacao paisagem e telas de baixa altura podem rolar normalmente.

Com `prefers-reduced-motion: reduce`, abertura, transicoes e resultado aparecem
sem parallax, mascaras ou deslocamentos. O conteudo nunca depende de animacao
para ficar visivel.

## Arquitetura

O MVP usa HTML, CSS e JavaScript nativos, servido por Node.js 20 sem dependencias
externas.

```text
public/
  index.html
  styles.css
  quiz.js
  app.js
server.mjs
tests/
.env.example
package.json
```

`quiz.js` exporta perguntas e classificacao como dados e funcoes puras usadas no
navegador e no servidor. `app.js` mantem o estado temporario, a navegacao e a
apresentacao. `server.mjs` serve os arquivos estaticos e expoe `GET /api/config`
e `POST /api/leads`.

`GET /api/config` entrega somente `privacyPolicyUrl`, `owntimeUrl` e `nestUrl`.
O token e a URL do webhook nunca fazem parte dessa resposta.

Variaveis de ambiente:

- `PORT`: porta HTTP local;
- `LEAD_WEBHOOK_URL`: destino server-side do lead;
- `LEAD_WEBHOOK_TOKEN`: token Bearer opcional;
- `PRIVACY_POLICY_URL`: URL exibida ao lado do consentimento;
- `OWNTIME_URL`: destino oficial do resultado Owntime;
- `NEST_URL`: destino oficial do resultado Nest.

O servidor encerra a inicializacao com erro claro quando uma URL publica esta
ausente ou invalida. Durante desenvolvimento, Novelin usa apenas o arquivo
oficial licenciado fornecido ao projeto; o fallback tecnico e `Arial, sans-serif`
e nao deve ser tratado como identidade aprovada para publicacao.

## Fluxo de dados

As escolhas ficam apenas na memoria do navegador ate o envio do formulario. O
navegador envia:

```json
{
  "name": "Nome",
  "whatsapp": "+5551999999999",
  "email": "nome@example.com",
  "consent": true,
  "answers": ["owntime", "nest", "owntime", "nest", "owntime"],
  "result": "owntime",
  "utm": {
    "source": "instagram",
    "medium": "social",
    "campaign": "quiz",
    "content": "story",
    "term": "gramado"
  }
}
```

O navegador le apenas `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`
e `utm_term` da URL. O servidor valida os campos, exige exatamente cinco
respostas reconhecidas e
recalcula pontuacao e resultado. O valor `result` recebido do navegador nunca e
tratado como autoridade. O webhook recebe os dados normalizados e o resultado
recalculado. O servidor acrescenta `consentAt` e `submittedAt` com o horario de
recebimento, em UTC.

## Validacao e falhas

- nome entre 2 e 120 caracteres, e-mail de ate 254 caracteres e WhatsApp
  brasileiro com DDD e 10 ou 11 digitos sao obrigatorios;
- o WhatsApp e normalizado para `+55` antes do encaminhamento;
- consentimento deve ser `true` e recebe data valida;
- corpo JSON possui limite de 16 KB para evitar abuso;
- metodo e tipo de conteudo incorretos sao rejeitados;
- sem webhook configurado, o endpoint retorna indisponibilidade e nao confirma o
  lead;
- respostas nao exitosas e timeout de 10 segundos do webhook exibem mensagem
  clara e preservam o formulario para nova tentativa;
- envios repetidos desabilitam temporariamente o botao enquanto a requisicao
  esta em andamento;
- logs de erro nao incluem nome, telefone, e-mail ou token.

## Acessibilidade

- estrutura com `main`, titulo principal, `form`, `fieldset` e `legend`;
- respostas implementadas como controles nativos com rotulos completos;
- progresso possui texto, nao apenas cor ou segmentos visuais;
- foco visivel e ordem de tabulacao previsivel;
- mudancas de pergunta, resultado e erros sao anunciadas;
- contraste atende WCAG AA;
- nenhuma navegacao, resposta ou envio depende de gesto, hover ou animacao.

## Verificacao

`npm run verify` executa testes nativos do Node. A verificacao minima cobre:

- todos os placares possiveis e sua maioria correta;
- rejeicao de quantidade ou valores invalidos de respostas;
- normalizacao e validacao do lead;
- recalculo server-side contra resultado adulterado;
- encaminhamento do payload documentado e token opcional;
- indisponibilidade quando o webhook nao esta configurado;
- falha honesta quando o webhook rejeita o lead;
- entrega dos arquivos e dos endpoints isolados do projeto;
- exposicao apenas das URLs publicas por `GET /api/config`.

A verificacao manual cobre celular estreito, celular de baixa altura, tablet e
desktop; teclado; zoom de 200%; movimento reduzido; falha e sucesso do webhook.

## Criterios de aceite

- o visitante conclui as cinco perguntas sem fornecer dados pessoais;
- voltar e avancar preserva as escolhas da sessao;
- qualquer placar apresenta somente o empreendimento com maioria simples;
- resultado aparece antes do formulario;
- o efeito cinematografico permanece fluido e possui alternativa sem movimento;
- o servidor nunca aceita como verdadeiro o resultado calculado pelo navegador;
- nenhum lead e confirmado sem resposta bem-sucedida do webhook;
- a experiencia funciona primeiro em celular e permanece responsiva em desktop;
- nenhum claim restrito das notas canonicas aparece na interface.
