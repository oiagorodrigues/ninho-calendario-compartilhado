---
phase: 0
completed: 2026-11-15T14:00:00Z
status: done
advisor_status: not_applicable
track: lightweight
---

# Phase 0 — Target path

## Summary

Target: the repository root (Ninho, family shared calendar web app). The user asked for the whole project to be built and decided autonomously ("faça tudo de forma automatizada e decida sozinho ... crie um harness e design para isso"), so the orchestrator answered the Phase 0 interview itself. The interview was waived on that explicit user instruction; every answer below is an orchestrator decision the user can revise by re-running harness-setup.

## Pre-collected Answers

| Item | Answer | Source | Option label |
|------|--------|--------|--------------|
| Path | the repository root | user delegated | N/A |
| A1 name and description | Ninho — family shared calendar (Vue 3 + Vite, Hono, node:sqlite) | user delegated | N/A |
| A2 type | Web app | user delegated | Web app |
| A3 solo or team | Solo | user delegated | Solo |
| A5 performance tier | Balanced | user delegated | 균형형 (권장) |
| A6 quality axes | Frontend design and UX; Strict Coding | user delegated | 프론트엔드 디자인·UX ; Strict Coding |
| A7 usage frequency | Medium (several times a week) | user delegated | 중빈도 (주 3회 ~ 매일) |
| A8 operational maturity | Personal tool | user delegated | 개인 도구 |
| A9 task complexity | Medium | user delegated | 중간 |
| A10 agreed scope | Slim (3-5 SKILL.md or agents, reviewer 0, ~10 files) | user delegated | 슬림 (3-5 SKILL.md / 에이전트, reviewer 0, ~10 파일, 15-25분) |

Operating mode: Fast Mode (user asked for everything to be done without questions).

## Scan Results

- Stack: Vue 3.5 + vue-router 5 + Vite 8 (src/web), Hono 4 on Node 26 with node:sqlite (src/server), zod 4 shared schemas (src/shared), TypeScript 6 with erasableSyntaxOnly (Node runs .ts directly).
- 46 files under src, tests and scripts; max depth 3; single service; deploy = one Node process serving API and built SPA.
- Checks: `pnpm lint` (eslint flat config), `pnpm typecheck` (vue-tsc), `pnpm test` (vitest: tests/server, tests/shared), `pnpm test:e2e` (Playwright desktop + Pixel 7, own server on :8790), `pnpm check` = lint + typecheck + test.
- Docs: README.md, docs/decisoes.md, docs/design/{README,tokens,ux-regras}.md, src/web/styles/tokens.css as token source of truth.
- Not a git repo with commits yet (git init done, nothing committed). No CI.

## Files Generated

- docs/ninho-harness/00-target-path.md

## Context for Next Phase

- Track: lightweight (solo, web app, not an agent project, 46 files, single service, simple deploy, no migration or multi-service signal).
- Generated prose in Portuguese (pt-BR), code identifiers and file names in English, matching the repo.
- Frontend preset injection: yes (A6 includes frontend design and UX). Strict Coding: yes, through existing `pnpm check`, not the 6-step preset (slim scope).
- Code project: yes.

## Escalations

Nenhuma.

## Next Steps

Phase 1-2 (phase-setup) scans the repo and writes the base harness.
