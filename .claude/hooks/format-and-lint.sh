#!/usr/bin/env bash
# PostToolUse hook: ESLint --fix (JS/TS, incl. whitespace rules) then Prettier (any supported file) on the saved file.
f=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"

[ -n "$f" ] && [ -f "$f" ] || exit 0
case "$f" in "$root"/*) ;; *) exit 0 ;; esac
cd "$root" || exit 0

case "$f" in
  *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs)
    out=$(npx --no-install eslint --fix --no-warn-ignored "$f" 2>&1) || {
      echo "$out" >&2
      # still format so the file ends up clean even when unfixable lint errors remain
      npx --no-install prettier --write --ignore-unknown "$f" >/dev/null 2>&1
      exit 2
    }
    ;;
esac

# Prettier last: it has the final say on formatting.
npx --no-install prettier --write --ignore-unknown "$f" >/dev/null 2>&1
exit 0
