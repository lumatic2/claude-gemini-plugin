---
description: Show the final output of a completed Gemini job
argument-hint: "[job-id]"
allowed-tools: Bash(node:*)
---

Run: `node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" result $ARGUMENTS`

Return the output verbatim.
