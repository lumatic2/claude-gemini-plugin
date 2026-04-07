---
description: Delegate investigation, a fix request, or complex task to the Gemini rescue subagent
argument-hint: "[--background|--wait] [--model pro|flash] [what Gemini should investigate or solve]"
context: fork
allowed-tools: Bash(node:*)
---

Route this request to the `gemini:gemini-rescue` subagent.

Raw user request:
$ARGUMENTS

Execution mode:
- If `--background`, run subagent in background.
- If `--wait` or no flag, run in foreground.
- Strip execution flags from task text. Pass `--model` through to the subagent.

Operating rules:
- Return Gemini's output verbatim.
- Do not summarize, paraphrase, or add commentary.
- Do not ask the subagent to do follow-up work beyond forwarding.
- If Gemini is missing, tell the user to run `!npm install -g @google/gemini-cli`.
