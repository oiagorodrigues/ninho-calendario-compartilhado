---
phase: 1-2
completed: 2026-11-15T15:00:00Z
status: done
advisor_status: note
track: lightweight
---

# Phase 1-2 — Discovery and base harness

## Summary

Scanned the finished Ninho repo (Vue 3 + Vite front in `src/web`, Hono + `node:sqlite` API in `src/server`, zod schemas in `src/shared`, vitest and Playwright tests) and wrote a slim base harness in Brazilian Portuguese. CLAUDE.md (109 lines) is a router: real commands from `package.json`, code conventions read from the source (erasableSyntaxOnly, `AppError`, append-only `MIGRATIONS`, `publish()` after every write, UTC vs local dates, CSRF guard), `@import` of README.md and docs/decisoes.md, a routing protocol (P/M/G) and a workflow table pointing at the SKILL.md files. `.claude/settings.json` allows only the repo's check and read-only git commands and denies `.env` access, `rm -rf` and force pushes. Installed the intent gate baseline (rule + skill), the read-only `code-researcher`, and the frontend design preset (designer, reviewer, skill) rewritten around the existing "Mesa" design system so `docs/design/ux-regras.md`, `docs/design/tokens.md` and `src/web/styles/tokens.css` stay the single source; no parallel design docs. The user delegated every decision, so the questions this phase normally escalates are recorded below as resolved decisions.

## Scan Results

```
[Target Project Scan Results]
- Path: the repository root
- Key files: package.json, pnpm-lock.yaml, tsconfig.json, vite.config.ts, vitest.config.ts, playwright.config.ts, eslint.config.js, .env.example
- Language(s): TypeScript (Node runs .ts directly), Vue SFC
- Framework: Vue 3.5.45 + vue-router 5.5.1 + Vite 8.3.8; Hono 4.13.18 + @hono/node-server 2.1.8; zod 4.6.7
- Build tool: pnpm; `vite build` -> dist/web; server has no build step
- Test setup: vitest 5.1.0 (tests/server, tests/shared, TZ=America/New_York), Playwright 1.65.1 (tests/e2e, Desktop Chrome 1440x900 + Pixel 7, own server on :8790)
- Lint/type: eslint 10 flat config (no-explicit-any, no-non-null-assertion, vue/no-v-html as errors); vue-tsc with strict + noUncheckedIndexedAccess + erasableSyntaxOnly
- Git: .git present, branch main, no commits yet; .gitignore already lists .claude/settings.local.json and CLAUDE.local.md
- Existing Claude/Cursor: none (.claude/, .cursor/, AGENTS.md, CLAUDE.md all absent before this phase)
- Complexity signals:
  - Source files (.ts/.js/.vue outside node_modules and dist): 48; files under src+tests+scripts: 46
  - Max directory depth: 4 (excluding node_modules, .git, dist)
  - Env files: .env.example only (.env is gitignored and absent)
  - CI workflows: 0 (no .github/)
  - docker-compose services: none (no docker-compose.yml, no Dockerfile)
  - Extra package.json outside root: 0
  - Lines in src + tests: about 5,700
```

Commands used: `find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.vue" \) -not -path "./node_modules/*" -not -path "./dist/*" | wc -l`, `find src tests scripts -type f | wc -l`, `ls -a`, `ls .github docker-compose.yml Dockerfile`, `git status`.

### Frontend Signal Score

Not computed: A6 includes frontend design and UX, which promotes the preset directly (fresh-setup Step 3-E A6 rule). For reference, artifact signals: vue (+2), `src/web/styles/` + `src/web/components/` (+1), `src/server/` is under src, not the root (0).

## Pre-collected Answers

| Item | Answer |
|------|--------|
| A1 | Ninho — family shared calendar (Vue 3 + Vite, Hono, node:sqlite) |
| A2 | Web app |
| A3 | Solo |
| A5 | 균형형 |
| A6 | 프론트엔드 디자인·UX ; Strict Coding |
| A7 | 중빈도 |
| A8 | 개인 도구 |
| A9 | 중간 |
| A10 | 슬림 |

Source for every row: user delegated all decisions (see 00-target-path.md). Scan matches A1/A2 (Vue + Hono web app, single service).

## Files Generated

- CLAUDE.md — 109 lines, pt-BR: intent check on top, project, stack, commands, code conventions, interface pointers, verification, routing protocol, workflow table, collaboration
- .claude/settings.json — allow 14 (pnpm lint/typecheck/test/test:e2e/build/check plus file-scoped test runs, git status/diff/log), deny 13 (.env read/edit/write and cat, .env.local/.env.production read, rm -rf, sudo rm, git push --force/-f/--force-with-lease)
- .claude/rules/intent-gate.md — always-apply intent check (baseline, translated to pt-BR)
- .claude/skills/intent-clarifier/SKILL.md — question loop through AskUserQuestion (baseline, translated)
- .claude/agents/code-researcher.md — read-only research agent (baseline, translated; `tools: Read, Glob, Grep`)
- .claude/agents/frontend-designer.md — preset, adapted to the Mesa design system; writes only to src/web/, public/, tests/e2e/, docs/design/
- .claude/agents/frontend-ux-reviewer.md — preset, read-only, audits against ux-regras.md rule numbers
- .claude/skills/frontend-design/SKILL.md — preset entry point: sources of truth, who does what, steps, color rules, forbidden patterns
- docs/ninho-harness/01-discovery-answers.md — this file

Not changed: .gitignore (already ignores both local files), app code, tests, package.json, existing docs.

## Context for Next Phase

- Project type: web app (family shared calendar), personal tool, solo
- Stack: TypeScript 6 on Node 24+, Vue 3.5 + vue-router 5 + Vite 8, Hono 4, node:sqlite, zod 4; pnpm; vitest 5 + Playwright 1.65; eslint 10 + vue-tsc
- Solo/team: solo (1 person)
- Agent project: no (no agent/pipeline/LLM signals in A1 or the tree). Fast-Forward: not recommended
- Directory structure: src/web (views, components, lib, styles), src/server (app, auth, families, events, ics, bus, db, errors, rows, index), src/shared (schemas, recurrence, constants), tests/{server,shared,e2e}, scripts/seed.ts, docs/{decisoes.md, design/}. Source files 48, max depth 4
- Existing .claude/.cursor: none before this phase. Env files: .env.example only. CI workflows: 0. docker-compose services: none. Extra package.json: 0
- Code project: yes — src/ plus package.json plus TypeScript detected
- code-researcher agent: installed (code project baseline)
- Intent Gate baseline installed: yes
- Frontend preset injected: yes (A6). allowed_dirs set automatically to src/web/, public/, tests/e2e/, docs/design/ (all exist). Phase 5 and 6 must not rewrite frontend-designer.md, frontend-ux-reviewer.md or skills/frontend-design/
- Strict Coding: no 6-step workflow; strictness comes from `pnpm check` plus `pnpm test:e2e` in CLAUDE.md "Verificação"
- Agreed Scope: 슬림, AI Recommended: 슬림, Justification: finished single-service app, 46 files, solo personal tool, checks already scripted; current harness is 8 files plus artifacts
- Anti-duplication gate: triggered (A6 has 2 axes), so CLAUDE.md is a router and workflow detail lives in the SKILL.md and agent files
- Language: generated prose in pt-BR; identifiers, file names and commands in English
- User-Declared Structure: no special structure signal (no migration, multi-service or agent chain wording; the user asked for a harness and design for the existing app)
- Natural-language effect: with this setup Claude runs lint, typecheck, unit, e2e and build checks and read-only git commands without asking, asks every time for anything else (installs, dev server, seed, other git commands), and cannot read `.env`, run `rm -rf` or force push

## Escalations

- [NOTE] Phase 0 validator exits 1 on the "user delegated" source tokens (`validate-phase-artifact.sh 00-target-path.md`). Not raised as BLOCKING, per the user's explicit delegation relayed by the orchestrator.
- [NOTE] Decided under user delegation (normally an ASK): Frontend design preset install (A6 includes frontend design and UX) → installed, adapted to the existing Mesa design system.
- [NOTE] Decided under user delegation (normally an ASK): Strict Coding 6-Step workflow (A6 includes Strict Coding; scan signals 3/7: TS strict, vitest + playwright, about 5,700 lines) → not adopted under slim scope; `pnpm check` + `pnpm test:e2e` enforced through CLAUDE.md.
- [NOTE] Decided under user delegation (normally an ASK): Q5-Q9 design inputs (principles, commit rules, allowed and denied commands, special needs) → principles and commands taken from the scan; no commit convention file exists, so no commit rule was written; no hooks, env or MCP added.
- [NOTE] Decided under user delegation (normally an ASK): Q10 ask-first-when-uncertain line in CLAUDE.md → Yes (recommended default), in "Colaboração".
- [NOTE] Decided under user delegation (normally an ASK): Generation plan approval → plan executed as listed in Files Generated.
- [NOTE] code-navigation rule not installed: no code map file exists and README.md "Estrutura" already maps the tree for a 46-file repo.
- [NOTE] question-discipline rule file not created; the one-line rule (subagents return questions in their report) sits in CLAUDE.md "Colaboração" and in both frontend agents, to keep the slim file count.
- [NOTE] CLAUDE.local.md and .claude/settings.local.json templates not created. Both are already gitignored; empty templates would only add an always-loaded file with no content.
- [NOTE] Baseline files (intent-gate, intent-clarifier, code-researcher) were translated to pt-BR with the same structure and meaning, because the project's generated prose is pt-BR. code-researcher uses the `tools:` frontmatter key instead of the template's `allowed_tools`/`allowed_dirs`, since `tools` is the key Claude Code reads to restrict a subagent. The frontend agents keep `allowed_dirs` as a declared write scope and repeat it in the body, since that key is not enforced.
- [NOTE] Preset rules that conflict with this repo were replaced by the repo's own values: touch targets 24/40/44px (ux-regras rule 7) instead of 44px everywhere, motion 150-380ms instead of 150-250ms, 15px body text, hex tokens in tokens.css instead of an OKLCH migration, the in-house `AppIcon.vue` set instead of an icon library.

## Next Steps

- Lightweight track: continue with the orchestrator's next lite step (design of remaining workflow pieces, if any, then final validation). Under slim scope no further agents or skills look necessary.
- Full track equivalent: Phase 3-4 (phase-design) would be next; Phase 5 and 6 must respect preset ownership of the three frontend files.
- To use the harness now: open Claude Code in the repository root.
