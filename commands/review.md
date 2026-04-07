---
description: Ask Gemini to review current uncommitted changes or a branch diff
argument-hint: "[--base <ref>] [--background|--wait]"
context: fork
allowed-tools: Bash(node:*)
---

Route this code review request to the `gemini:gemini-rescue` subagent.

Raw user request:
$ARGUMENTS

Instructions:
- Run: `node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" review $ARGUMENTS`
- Return the output verbatim.
- `--base <ref>` compares current branch to that ref.
- Supports `--background` and `--wait`.
