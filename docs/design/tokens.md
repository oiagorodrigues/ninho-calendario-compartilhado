# Tokens

A fonte da verdade é `src/web/styles/tokens.css`. Este arquivo explica o uso.

## Cor

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `--bg` | `#f5f1e8` | `#171511` | Fundo da página e dos campos |
| `--surface` | `#fffdf8` | `#201d18` | Cartões, diálogos, grade do mês |
| `--surface-2` | `#efe9dc` | `#2b2720` | Hover, botões secundários, segmentos |
| `--line` | `#e2daca` | `#38332a` | Bordas e divisórias |
| `--ink`, `--ink-2`, `--ink-3` | `#1f1c17` … `#6b6454` | `#f3eee4` … `#9a9282` | Texto principal, secundário, terciário |
| `--accent` | `#b5482a` | `#d8653f` | Ação principal e "hoje" |
| `--danger` | `#a3311f` | `#ef7a62` | Excluir, erros |
| `--m1` … `--m8` | | | Cor de cada pessoa |
| `--on-member` | `#fff` | `#1a140d` | Texto sobre cor de pessoa |

As cores de pessoa ficam guardadas no banco como `m1`…`m8`, então o tema escuro troca o tom sem migrar dados. Todas passam de 4.5:1 com `--on-member`, no claro (5.3 a 6.9) e no escuro (4.7 a 6.6). `--ink-3` tem 5.2:1 sobre `--bg` no claro e 5.9:1 no escuro.

## Tipografia

Bricolage Grotesque (500, 700) nos títulos, com `letter-spacing` negativo. Hanken Grotesk (400 a 700) no texto, 15px/1.45. Números de hora usam `font-variant-numeric: tabular-nums`.

## Espaço, raio, sombra

Espaço em `--space-1` a `--space-7` (4, 8, 12, 16, 24, 32, 48). Raios `--radius-s` 8, `--radius-m` 14, `--radius-l` 22 e `--radius-pill`. Sombras `--shadow-1` para cartões e `--shadow-2` para diálogos e hover.

## Movimento

`--ease` é `cubic-bezier(.2,.7,.2,1)`, com `--dur-fast` 150ms, `--dur` 220ms e `--dur-slow` 380ms. Tudo respeita `prefers-reduced-motion`.

## Pontos de quebra

Até 720px é celular: agenda como tela inicial, sem visão de semana, diálogos em tela cheia. Até 1080px some a barra lateral e aparecem abas inferiores, botão flutuante de novo evento e filtro em diálogo.
