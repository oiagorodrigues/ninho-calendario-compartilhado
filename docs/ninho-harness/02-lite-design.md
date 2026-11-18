---
phase: L
completed: 2026-11-15T16:00:00Z
status: done
advisor_status: note
session_recovery: not_applicable
artifact_versioning: idempotent
---

# Phase L — Design leve

## Summary

**Trilha leve — design de um agente em uma passada. Se a sessão cair, refazer do início (25 a 35 minutos).**

O Ninho é um app solo de uso pessoal, com 46 arquivos em `src`, `tests` e `scripts`, um único serviço e deploy por um processo Node. Decisões:

- Fluxo: sessão única, sem sequência de passos fixa. As verificações já existem em `pnpm check` e `pnpm test:e2e`.
- Agentes de equipe: nenhum. Os agentes da Fase 1-2 (`code-researcher`, `frontend-designer`, `frontend-ux-reviewer`) continuam como estão e não entram nesta contagem.
- Skills novas: nenhuma. A skill `frontend-design` e o `intent-clarifier` já existem.
- Revisão de pipeline: dispensada (`review_exempt: true`), pois não há pipeline de geração, decisão ou design com agentes.
- Hooks: um candidato, lint do arquivo editado após Edit/Write. MCP: nenhum.

## Files Generated

- docs/ninho-harness/02-lite-design.md — este arquivo, único produto desta fase.

## Context for Next Phase

### Fluxo

- Método: sessão única
- Passos: não há sequência fixa. O trabalho segue a tabela "Fluxos" do CLAUDE.md e termina com `pnpm check` (e `pnpm test:e2e` quando mexe na interface).
- Gatilho do usuário: a cada pedido

### Declaração de agentes

- Conclusão: nenhum agente de equipe
- Justificativa: projeto solo, sem tarefa periódica automática no scan e sem pedido de agente de automação (decisão delegada, escopo slim). Os três agentes da Fase 1-2 são ferramentas do orquestrador e dos presets, não passos de um fluxo.
- Lista: não se aplica

### Portão de revisão de pipeline

- review_exempt: true
- exempt_reason: sessão única, sem pipeline de geração, decisão ou design com agentes
- Agente revisor: nenhum

### Skills

- Conclusão: nenhuma skill nova
- Lista: não se aplica

### Candidatos a hook e MCP

- Hooks:
  - lint-edited-file: PostToolUse em `Edit|Write|MultiEdit`, roda `pnpm exec eslint --no-warn-ignored <arquivo>` só para `.ts` e `.vue` sob `src/` ou `tests/`. Sai com código 2 e a saída do eslint em stderr se o lint falhar. Cobre a regra de `no-explicit-any`, `no-non-null-assertion` e `vue/no-v-html`, que o CLAUDE.md trata como erro.
  - Descartados: `pre-commit` e `pre-push` (repo sem commits, sem CI, projeto solo; `pnpm check` roda sob demanda), typecheck por edição (vue-tsc é lento demais para rodar a cada edição), guarda de propriedade (não há equipe de agentes com escrita concorrente).
- MCP: nenhum
- Fases 7-8 puláveis: não. Há 1 hook a instalar; MCP é "nenhum".

### Baselines verificados

- code-researcher: confirmado (`.claude/agents/code-researcher.md` existe; CLAUDE.md "Roteamento de pedidos" cita `code-researcher`).
- Seção de roteamento: confirmada (`## Roteamento de pedidos`).
- Intent Gate: confirmado. `.claude/rules/intent-gate.md` tem `alwaysApply`, `.claude/skills/intent-clarifier/SKILL.md` tem `name: intent-clarifier`, e o CLAUDE.md traz a seção `## Antes de começar uma tarefa` (título traduzido do original) citando `intent-gate.md` e `intent-clarifier`.
- Presets de frontend preservados: `frontend-designer.md`, `frontend-ux-reviewer.md` e `skills/frontend-design/` não foram tocados.

### Guardas operacionais (trilha leve)

- Session Recovery: not applicable — single-pass lightweight track. Se a sessão cair, refazer do início.
- Artifact Versioning: idempotent — caminhos fixos numerados em `docs/ninho-harness/`. Reexecutar sobrescreve com segurança.

### Caminho de upgrade

- Trilha atual: lightweight
- Reentrada na trilha completa: rodar `/harness-architect harness-setup` de novo. Ao achar `02-lite-design.md`, a execução retoma na Fase 3 (workflow-design), com `01-discovery-answers.md` e este arquivo como contexto.
- Gatilhos: mais de uma pessoa no projeto, pipeline de agentes, CI e deploy em mais de um ambiente, fluxo de código mais pesado.

### Alternativas rejeitadas

- Sequência de 2 passos (escrever, depois verificar): `pnpm check` já faz a segunda parte, e o CLAUDE.md descreve isso.
- Agente de testes ou de migração: sem tarefa recorrente que o justifique.
- Hook de pre-commit: repo sem commits ainda e sem CI; o hook de lint por edição pega o erro mais cedo.

## Escalations

- [NOTE] Decidido sob delegação do usuário (normalmente seria ASK): nenhum agente de equipe e nenhuma skill nova.
- [NOTE] A seção do CLAUDE.md está como "Antes de começar uma tarefa", tradução do "작업 시작 전" do playbook. Contei como Intent Gate presente.

## Next Steps

Seguir para as Fases 7-8 (`phase-hooks`) para instalar o hook `lint-edited-file`. Não há MCP a recomendar. `05-skill-specs.md` não existe na trilha leve.
