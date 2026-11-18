# Ninho

## Antes de começar uma tarefa

Ao receber um pedido novo, confirme o que a pessoa quer **antes** de pesquisar, planejar ou mexer em arquivos.
O procedimento está em `.claude/rules/intent-gate.md`. Se faltar contexto, use a skill
`.claude/skills/intent-clarifier/`, que pergunta pela ferramenta `AskUserQuestion`.

Resumo:
- Pedido de criação, migração, design, decisão ou de escopo vago exige confirmar a intenção
- Perguntas só pela ferramenta `AskUserQuestion` (nunca uma lista de perguntas em texto esperando resposta)
- Antes da confirmação, nada de escrever arquivos, pesquisar fora do repositório ou fechar um plano

## O projeto

Agenda compartilhada da família: cada pessoa tem uma cor, os eventos mostram quem participa e as mudanças
aparecem na hora para todos. Projeto de uma pessoa só, usado como ferramenta pessoal.

@README.md
@docs/decisoes.md

## Stack

- Front: Vue 3.5 + vue-router 5 + Vite 8, em `src/web` (raiz do Vite; `dist/web` no build)
- API: Hono 4 sobre `@hono/node-server`, em `src/server`, com SQLite via `node:sqlite`
- Compartilhado: schemas zod 4 e expansão de recorrência, em `src/shared`
- TypeScript 6 executado direto pelo Node 24+ (sem etapa de compilação no servidor)
- Testes: vitest (`tests/server`, `tests/shared`) e Playwright (`tests/e2e`, desktop e Pixel 7)
- Gerenciador: pnpm. Versões das dependências fixadas sem `^`

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | API em :8787 e web em http://localhost:5173 (proxy de `/api` e `/ics`) |
| `node scripts/seed.ts` | Cria a família de demonstração (`ana@exemplo.com` / `senha-demo-123`) |
| `pnpm check` | `pnpm lint` + `pnpm typecheck` + `pnpm test` |
| `pnpm test tests/server/api.test.ts` | Roda um arquivo de teste do vitest |
| `pnpm test:e2e` | Build + servidor próprio em :8790 com `data/e2e.db` recriado a cada execução |
| `pnpm build` / `pnpm start` | Produção: um processo Node serve a API e o SPA na mesma porta |

## Convenções de código

- O Node roda `.ts` direto, então o `tsconfig` liga `erasableSyntaxOnly`: nada de `enum`, `namespace`
  ou parameter properties. Imports relativos levam a extensão `.ts` e tipos entram com `import type`.
- `strict` e `noUncheckedIndexedAccess` estão ligados. O ESLint proíbe `any`, non-null assertion (`!`)
  e `v-html`; argumentos não usados começam com `_`.
- Todo corpo de requisição tem schema zod em `src/shared/schemas.ts`, usado pela API e pelo front.
  Entradas usam `z.strictObject`.
- Erros esperados da API são `AppError` (`src/server/errors.ts`) com um `ErrorCode`; qualquer outro
  erro vira 500. O front lê esse formato em `src/web/lib/api.ts` (`ApiError`).
- Toda rota que altera dados chama `publish(familyId, change)` em `src/server/app.ts`, para o SSE de
  `bus.ts` avisar as outras telas abertas.
- Mudança de schema do banco entra como **novo item no fim** de `MIGRATIONS` em `src/server/db.ts`.
  Nunca edite uma migração existente: `PRAGMA user_version` marca quais já rodaram.
- Evento de dia inteiro guarda data local (`2026-11-20`); evento com hora guarda instante UTC.
  A recorrência expande no navegador (`src/shared/recurrence.ts`). O vitest roda com
  `TZ=America/New_York` para pegar erro de horário de verão.
- Escritas exigem mesma origem e corpo JSON (proteção CSRF em `src/server/app.ts`). Não afrouxe isso.
- Uma pessoa pertence a uma família só, e qualquer membro edita qualquer evento (`docs/decisoes.md`).

## Interface

As regras de design e UX moram em `docs/design/ux-regras.md` e `docs/design/tokens.md`, e os tokens
em `src/web/styles/tokens.css`. Trabalho de tela segue a skill `.claude/skills/frontend-design/`.
`docs/design/r1/` guarda a rodada de exploração já decidida e não muda.

## Verificação

- Antes de dar uma tarefa de código por terminada, rode `pnpm check` e confira que passa.
- Se a mudança tocar tela, fluxo ou rota usada pelo front, rode também `pnpm test:e2e`.
- Mudança de regra de negócio ganha teste em `tests/server` ou `tests/shared` junto.

## Roteamento de pedidos

A sessão principal decide, a cada pedido, se resolve sozinha ou chama um agente de `.claude/agents/`.

1. **Precisa ler código para entender o pedido?** Se a pergunta for aberta ou envolver mais de 3
   arquivos, chame `code-researcher` e trabalhe com o resumo. Se já souber o arquivo, leia direto.
2. **Tamanho do trabalho**, a partir do resumo e do pedido:

   | Nível | Critério | Caminho |
   | --- | --- | --- |
   | P | Até 3 arquivos, solução óbvia, sem dependência nova | A sessão principal resolve, ou chama um agente |
   | M | 5 a 15 arquivos, 1 ou 2 decisões de design | Só os passos do fluxo que fizerem falta |
   | G | Funcionalidade nova, dependência nova, mudança de modelo de dados | Fluxo completo |

3. **Revisão não se pula.** Tela, componente ou fluxo novo é sempre M ou mais e passa pelo par
   `frontend-designer` → `frontend-ux-reviewer`. Ajuste pontual em código existente (bug, texto,
   valor de configuração, tipo) pode ser P.
4. Na dúvida entre níveis, use M; se a dúvida for grande, G. Baixar de nível só a pedido da pessoa.
5. Use só os agentes que existem em `.claude/agents/`; não invente agente na hora.
6. Se a pessoa pedir "fluxo completo" ou "faz rápido", siga o pedido, menos o item 3.

## Fluxos

| Fluxo | Quando | Onde está o detalhe |
| --- | --- | --- |
| Confirmar intenção | Início de pedido novo ou vago | `.claude/skills/intent-clarifier/SKILL.md` |
| Entender código | Pergunta sobre onde ou como algo funciona | `.claude/agents/code-researcher.md` |
| Tela e UX | Tela, componente, layout, tema, acessibilidade | `.claude/skills/frontend-design/SKILL.md` |
| Código e testes | Qualquer outra mudança | Convenções e Verificação acima |
| Fluxo completo fora da interface | Pedido G que não é de tela | Intenção confirmada → `code-researcher` → plano curto → implementação → teste novo → `pnpm check` (e `pnpm test:e2e` se tocar rota usada pelo front) |

## Colaboração

- Se uma decisão ficar ambígua no meio do trabalho ou houver mais de uma opção razoável, pergunte com
  `AskUserQuestion` em vez de supor. Siga só respostas explícitas ou fatos conferidos no código.
- Subagentes não usam `AskUserQuestion`: devolvem as dúvidas no relatório e a sessão principal pergunta.
- Não leia nem edite `.env`; os valores de exemplo estão em `.env.example`.
