# LP Tijolo

Projeto isolado para a landing page Tijolo.

## Estado

O produto esta em definicao. Consulte `docs/product/brief.md` antes de escolher
a stack ou iniciar a implementacao.

## Estrutura

- `docs/product/brief.md`: objetivo, escopo e pendencias do produto.
- `scripts/`: automacoes locais do projeto.
- `tests/`: verificacoes automatizadas do projeto.
- `.env.example`: contrato das variaveis de ambiente, sem segredos.

## Verificacao

```sh
npm run verify
```

## Assets pendentes para publicacao

Esta versao de preview usa placeholders locais claramente identificados para as
cenas de resultado. A publicacao depende de fotografias e logos oficiais
aprovados de Owntime e Nest.

- Heros: no minimo `2400x1500`, paisagem e alta resolucao, com arquitetura ou
  natureza nos dois tercos da direita e o ponto focal dentro do recorte central
  seguro para celular.
- Logos: PNG transparente branco, com pelo menos `1600px` de largura, nos
  caminhos exatos `public/assets/results/owntime-logo-white.png` e
  `public/assets/results/nest-logo-white.png`.
- A troca dos heros fica restrita as URLs das propriedades customizadas em
  `public/styles.css`. Os elementos de imagem dos logos e seus fallbacks de texto
  ja existem no markup; ao adicionar os dois PNGs oficiais nos caminhos acima,
  o carregamento bem-sucedido exibe a imagem e mantem o texto acessivel sem
  qualquer mudanca estrutural, de CSS ou JavaScript.
