#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit): roda eslint no arquivo editado.
# Entrada: JSON no stdin. Sai com 2 e a saída do eslint em stderr se o lint falhar.
set -uo pipefail

INPUT="$(cat)"

if command -v jq >/dev/null 2>&1; then
  FILE_PATH="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
else
  FILE_PATH="$(printf '%s' "$INPUT" | python3 -c 'import json,sys
try:
    print(json.load(sys.stdin).get("tool_input", {}).get("file_path", "") or "")
except Exception:
    print("")' 2>/dev/null)"
fi

[ -z "$FILE_PATH" ] && exit 0

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
FILE_PATH="${FILE_PATH//\\//}"

case "$FILE_PATH" in
  /*) ABS="$FILE_PATH" ;;
  *)  ABS="$PROJECT_DIR/$FILE_PATH" ;;
esac

case "$ABS" in
  "$PROJECT_DIR"/src/*.ts|"$PROJECT_DIR"/src/*.vue|"$PROJECT_DIR"/src/**/*.ts|"$PROJECT_DIR"/src/**/*.vue|\
  "$PROJECT_DIR"/tests/*.ts|"$PROJECT_DIR"/tests/*.vue|"$PROJECT_DIR"/tests/**/*.ts|"$PROJECT_DIR"/tests/**/*.vue) ;;
  *) exit 0 ;;
esac

[ -f "$ABS" ] || exit 0

cd "$PROJECT_DIR" || exit 0
OUT="$(pnpm exec eslint --no-warn-ignored "$ABS" 2>&1)"
RC=$?
if [ "$RC" -ne 0 ]; then
  printf 'eslint falhou em %s:\n%s\n' "$ABS" "$OUT" >&2
  exit 2
fi
exit 0
