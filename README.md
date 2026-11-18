# Ninho

Agenda compartilhada da família. Cada pessoa tem uma cor, os eventos mostram quem participa e todo mundo da família vê as mudanças na hora, sem recarregar a página. Crianças e avós podem ter perfil sem conta, e a agenda inteira pode ser assinada no Google Agenda, Apple Calendário ou Outlook.

## Rodar

Precisa de Node 24 ou mais novo (usa `node:sqlite` e TypeScript nativo do Node) e pnpm.

```sh
pnpm install
cp .env.example .env
node scripts/seed.ts          # opcional: família de demonstração
pnpm dev                      # API em :8787 e web em http://localhost:5173
```

A família de demonstração entra com `ana@exemplo.com` e a senha `senha-demo-123`.

Em produção, `pnpm build` gera `dist/web` e `pnpm start` serve a API e o site na mesma porta (`NINHO_PORT`). Defina `NINHO_PUBLIC_URL` com o endereço público, porque ele monta os links de convite e de assinatura da agenda, e com `https://` o cookie de sessão passa a ser `Secure`.

## Variáveis

| Variável | Padrão | Uso |
| --- | --- | --- |
| `NINHO_PORT` | `8787` | Porta da API |
| `NINHO_DB` | `./data/ninho.db` | Arquivo SQLite |
| `NINHO_PUBLIC_URL` | `http://localhost:5173` | Base dos links de convite e da agenda assinável |
| `NINHO_AUTH_ATTEMPT_LIMIT` | `10` | Tentativas de login e cadastro por 15 minutos, por IP e por e-mail |

## Verificar

```sh
pnpm check        # lint + typecheck + testes de unidade e da API
pnpm test:e2e     # Playwright, desktop e celular, com servidor próprio em :8790
```

## Estrutura

- `src/shared` tem os schemas zod da API e a expansão de eventos recorrentes, que roda no navegador no fuso de quem vê.
- `src/server` tem a API Hono: `app.ts` (rotas), `auth.ts`, `families.ts`, `events.ts`, `ics.ts` (feed iCalendar) e `bus.ts` (avisos ao vivo via SSE).
- `src/web` tem o app Vue 3: `views/` para as páginas, `components/` e `lib/` para estado e utilitários.
- `tests/server`, `tests/shared` e `tests/e2e` têm os testes.
- `docs/design` tem as direções de design, tokens e regras de UX. `docs/decisoes.md` lista as decisões de produto e técnicas.
