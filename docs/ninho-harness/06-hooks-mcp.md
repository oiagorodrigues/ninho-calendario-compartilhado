---
phase: 7-8
completed: 2026-11-15T16:30:00Z
status: done
advisor_status: note
track: lightweight
---

# Fases 7-8 — Hooks e MCP

## Summary

Trilha leve. `05-skill-specs.md` não é produzido nesta trilha (não há skills novas, ver `02-lite-design.md`), então a validação de `allowed_dirs` por skill não se aplica. O arquivo `06-hooks-mcp.md` existe porque a Fase 9 exige esse nome.

Instalado um hook: `lint-edited-file`, PostToolUse em `Edit|Write|MultiEdit`. Ele roda `pnpm exec eslint --no-warn-ignored <arquivo>` só quando o arquivo editado fica em `src/` ou `tests/` e termina em `.ts` ou `.vue`. Se o lint falha, sai com código 2 e a saída do eslint vai para stderr, que o Claude lê. Nos outros casos sai com 0. O bloco `permissions` do `settings.json` ficou como estava.

Não instalados, por não compensarem num repo solo e pequeno: guarda de propriedade (sem agentes de equipe escrevendo em paralelo), guarda de comandos (o `permissions.deny` já cobre `.env`, `rm -rf` e force push), typecheck por edição (vue-tsc é lento), pre-commit e pre-push (repo sem commits e sem CI). MCP: nenhum.

## Hooks Installed

| Evento | Matcher | Script | Propósito |
|--------|---------|--------|-----------|
| PostToolUse | `Edit\|Write\|MultiEdit` | `.claude/hooks/lint-edited-file.sh` | Lint imediato do arquivo editado, para o Claude corrigir `any`, `!` não nulo e `v-html` no mesmo turno |

Detalhes do script:

- Lê o JSON do stdin e extrai `tool_input.file_path` com `jq`; se `jq` não existir, usa `python3`.
- Sai com 0 antes de chamar o eslint quando o caminho não está em `src/` ou `tests/`, a extensão não é `.ts` ou `.vue`, ou o arquivo não existe (por exemplo, foi apagado).
- Caminhos relativos são resolvidos contra `$CLAUDE_PROJECT_DIR`.
- Usa `set -uo pipefail`, sem `set -e`. Registrado com `"shell": "bash"` e `"timeout": 30`.
- Limite conhecido: o hook roda depois da escrita, então não impede a edição, só devolve o erro. O gate de verdade continua sendo `pnpm check`.

Testes executados (verified, comandos rodados nesta fase):

| Entrada | Esperado | Resultado |
|---------|----------|-----------|
| `src/server/bus.ts` (absoluto) | exit 0 | exit 0 |
| `src/server/bus.ts` (relativo) | exit 0 | exit 0 |
| arquivo temporário `.ts` em `src/server/` com `export const x: any = 1;` | exit 2 e erro no stderr | exit 2, `no-explicit-any` no stderr |
| `README.md` | exit 0 | exit 0 |

O arquivo temporário foi apagado. O ramo `python3` foi testado só no trecho de extração (devolve o caminho; JSON inválido devolve vazio), não ponta a ponta com `jq` ausente.

## MCP Servers

MCP: nenhum

Nenhum sinal no projeto pede MCP: app Node com SQLite local, sem serviço externo, sem GitHub Actions, sem banco remoto. Nada a registrar com `claude mcp add` nem `.mcp.json`.

## Settings.json Changes

### Hooks (settings.json)

Adicionada a chave `hooks` ao final de `.claude/settings.json`. As listas `permissions.allow` (14 itens) e `permissions.deny` (13 itens) não mudaram.

```json
"hooks": {
  "PostToolUse": [
    {
      "matcher": "Edit|Write|MultiEdit",
      "hooks": [
        {
          "type": "command",
          "shell": "bash",
          "timeout": 30,
          "command": "bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/lint-edited-file.sh"
        }
      ]
    }
  ]
}
```

### MCP (usuário aplica)

Não se aplica. Nenhuma recomendação.

## Verification Targets

- docs/ninho-harness/06-hooks-mcp.md
- .claude/hooks/lint-edited-file.sh (executável)
- .claude/settings.json

## Context for Next Phase

- Hook instalado: `.claude/hooks/lint-edited-file.sh`, permissão de execução ativa (`chmod +x`).
- MCP: nenhum, sem candidatos nem fontes a conferir.
- Arquivos a validar: o script, `settings.json` (JSON válido, `permissions` intacto, comando com `$CLAUDE_PROJECT_DIR`), `02-lite-design.md` e este arquivo.
- `05-skill-specs.md` não existe na trilha leve. A Fase 9 não deve tratá-lo como ausência.
- O hook não cobre edições feitas por Bash (por exemplo `sed -i`); isso não é bloqueado nem checado.

## Files Generated

- .claude/hooks/lint-edited-file.sh
- .claude/settings.json (somente a chave `hooks` adicionada)
- docs/ninho-harness/06-hooks-mcp.md

## Escalations

- [NOTE] Decidido sob delegação do usuário (normalmente seria ASK): instalar o hook de lint por edição e nenhum outro.
- [NOTE] Decidido sob delegação do usuário (normalmente seria ASK): MCP 0 — nenhum candidato.

## Next Steps

Fase 9: chamar o agente phase-validate. Como não há MCP, não há registro a conferir com `claude mcp list`.
