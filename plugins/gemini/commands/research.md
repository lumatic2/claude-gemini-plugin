---
description: Delegate research or web search tasks to Gemini
argument-hint: "[--background|--wait] [--model pro|flash] [what Gemini should research]"
context: fork
allowed-tools: Bash(node:*)
---

Route this request to the `gemini:gemini-rescue` subagent for research.

Raw user request:
$ARGUMENTS

Execution mode:
- If `--background`, run subagent in background.
- If `--wait` or no flag, run in foreground.
- Strip `--background`, `--wait`, `--model` from task text.
- Pass `--model` to the forwarded call if present.

Operating rules:
- Return Gemini's output verbatim.
- Do not summarize or add commentary.
- If Gemini is missing, tell the user to install with `npm install -g @google/gemini-cli`.
