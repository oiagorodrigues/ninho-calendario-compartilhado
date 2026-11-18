---
name: frontend-design
description: Fluxo para criar, alterar ou revisar a interface Vue do Ninho dentro do design system "Mesa". Use quando o pedido falar de tela, view, componente, layout, tema claro ou escuro, cor, tipografia, espaçamento, ícone, diálogo, responsividade, acessibilidade, animação, ou disser que a interface está genérica ou estranha.
---

# Interface do Ninho

O design system já existe. Esta skill diz como trabalhar dentro dele e quando chamar os agentes de
design e revisão.

## Fontes da verdade

| Arquivo | O que tem |
| --- | --- |
| `docs/design/ux-regras.md` | As 9 regras de interface, válidas em todos os tamanhos |
| `docs/design/tokens.md` | Uso de cada token de cor, tipografia, espaço, raio, sombra, movimento e quebras |
| `src/web/styles/tokens.css` | Valores dos tokens (claro, escuro por preferência e `[data-theme='dark']`) |
| `src/web/styles/base.css` | Estilos globais e `prefers-reduced-motion` |
| `docs/design/app-shots/` | Capturas do app pronto, para comparar antes e depois |

Se uma orientação geral de design divergir desses arquivos, eles vencem. Mudou uma regra ou um token,
atualize o documento correspondente na mesma mudança, sem criar documento paralelo.

## Quem faz o quê

| Situação | Quem faz | Revisão |
| --- | --- | --- |
| Ajuste pontual (uma cor, um espaçamento, um texto) | Sessão principal | Opcional |
| Tela, componente ou fluxo novo; redesenho; token novo | `frontend-designer` | `frontend-ux-reviewer`, obrigatória |
| "Está estranho", antes de dar por terminado, depois de refatorar | `frontend-ux-reviewer` | — |

Com BLOCK no parecer: na 1ª rodada o designer corrige e pede nova revisão; na 2ª a sessão principal
pergunta à pessoa se refaz, aceita ou edita à mão; na 3ª para e pergunta se ignora, edita à mão ou pula
a parte. ASK vira pergunta da sessão principal à pessoa; NOTE fica como pendência.

## Passos

1. **Intenção**: quem usa, a tarefa principal da tela e o que muda.
2. **Componentes**: reaproveite `src/web/components/` (`BaseDialog`, `AppIcon`, `MemberFilter`, grades de
   mês e semana, `AgendaList`) antes de criar outro.
3. **Tokens**: só `var(--...)`. Token novo vai no bloco claro e nos dois blocos escuros de `tokens.css`
   e ganha linha em `tokens.md`, com o contraste medido no claro e no escuro.
4. **Estados**: default, hover, `:focus-visible`, active, disabled; vazio, carregando e erro.
5. **Quebras**: confira até 720px, até 1080px e desktop largo.
6. **Verificar**: `pnpm check` e `pnpm test:e2e` (desktop e Pixel 7). Fluxo novo ganha caso em
   `tests/e2e/`.
7. **Revisar** com `frontend-ux-reviewer` quando a tabela acima pedir.

## Cor no Ninho

- Cores de pessoa ficam no banco como `m1`…`m8` e viram `--m1`…`--m8`; o tema escuro troca o tom sem
  migração. Texto sobre cor de pessoa usa `--on-member`.
- Terracota (`--accent`) é ação principal e "hoje". Use pouco: o fundo de aveia e as superfícies claras
  carregam a tela.
- Contraste mínimo de 4.5:1 para texto e 3:1 para borda de controle e ícone, nos dois temas. Os
  valores atuais estão medidos em `tokens.md`; cor nova traz a medição.
- Cor nunca é a única informação (regra 9): nome da pessoa na agenda, ponto colorido mais título no mês.

## Proibido

- hex, `rgb()` ou duração solta em componente
- Fonte, biblioteca de ícones ou biblioteca de componentes nova sem aprovação
- Diálogo que não use `BaseDialog` / `<dialog>` nativo
- Botão de ícone sem `aria-label` igual ao `title`
- Rolagem horizontal no celular
- Animação fora de `transform`/`opacity` ou que ignore `prefers-reduced-motion`
- Reescrever a tela inteira quando o pedido é melhorar uma parte
