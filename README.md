# claude-gemini-plugin

Delegate research, web search, and complex analysis tasks from Claude Code to the Gemini CLI.

Inspired by [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc), this plugin lets Claude Code call Gemini as a worker agent for tasks where Gemini's long context window and search integration excel.

## Features

- **`/gemini:rescue`** — Delegate investigation, fixes, or complex tasks to a Gemini subagent
- **`/gemini:research`** — Research and web search delegation
- **`/gemini:review`** — Ask Gemini to review git diffs
- **`/gemini:status`** — Check running / recent background jobs
- **`/gemini:result`** — Fetch the final output of a completed job
- **`/gemini:cancel`** — Cancel an active background job
- Background job scheduling with status/result/cancel workflow
- Foreground and background execution modes
- Model routing (`--model flash` / `--model pro`)
- Clean output filtering (strips YOLO banner, credential noise, MCP handshake)
- Windows / macOS / Linux support (dynamic `gemini` binary discovery incl. NVM fallback)

## Requirements

- [Claude Code](https://docs.claude.com/en/docs/claude-code) ≥ 2.1
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) installed and authenticated
  ```bash
  npm install -g @google/gemini-cli
  gemini auth
  ```
- Node.js ≥ 18

## Installation

### From this repo (local marketplace)

```bash
# 1. Clone the repo
git clone https://github.com/lumatic2/claude-gemini-plugin.git ~/claude-gemini-plugin

# 2. Add it as a marketplace in Claude Code
claude plugin marketplace add ~/claude-gemini-plugin

# 3. Install the plugin
claude plugin install gemini@claude-gemini-plugin
```

### Verify

Start a new Claude Code session and run:

```
/gemini:rescue --wait "hello, are you working?"
```

You should see Gemini's response.

## Usage

### Basic delegation

```
/gemini:rescue "Research the latest PEP 703 Python GIL removal status"
```

### Background mode

```
/gemini:rescue --background "Deep dive into 2026 LLM coding assistant trends"
```

Then check progress:

```
/gemini:status
/gemini:result <job-id>
```

### Model selection

```
# Fast (default): gemini-3-flash-preview
/gemini:rescue --wait "quick question"

# Deep analysis: gemini-3.1-pro-preview
/gemini:rescue --wait --model pro "analyze this 80-page paper: <content>"
```

### Code review

```
/gemini:review --base main
```

## Architecture

```
Claude Code session
    │
    ▼
/gemini:rescue command  (routes to subagent)
    │
    ▼
gemini:gemini-rescue subagent  (thin forwarder, single Bash call)
    │
    ▼
scripts/gemini-companion.mjs  (job manager, model routing, output filter)
    │
    ▼
gemini CLI  (actual Gemini invocation)
```

## License

MIT — see [LICENSE](./LICENSE)

## Related

- [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) — sister plugin for OpenAI Codex delegation
- [Claude Code Plugins docs](https://docs.claude.com/en/docs/claude-code/plugins)
