# claude-gemini-plugin

Claude Code 안에서 Gemini CLI를 research/review/rescue 작업자처럼 호출하는 플러그인입니다. Google 계정으로 인증된 `gemini` CLI를 그대로 사용하므로 별도 Gemini API 키나 MCP 서버 없이 백그라운드 작업, 모델 라우팅, 결과 조회 흐름을 제공합니다.

This plugin lets Claude Code delegate research, review, and rescue tasks to the Gemini CLI, with background jobs, model routing, and result retrieval.

> Delegate research, web search, and complex analysis from Claude Code to the Gemini CLI — with background jobs, model routing, and full Windows support.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](#requirements)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-2.1%2B-purple)](https://docs.claude.com/en/docs/claude-code)

Inspired by [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc), this is the Gemini-side counterpart: a native Claude Code plugin that lets Claude delegate work to Gemini as a worker agent.

## Why this plugin?

Several Gemini integrations exist for Claude Code already. Here's where this one is different:

| Feature | This plugin | Typical MCP-server alternatives |
|---|---|---|
| **Cost** | **Free** — uses `gemini` CLI's OAuth (works with Gemini Advanced subscription) | Pay-per-token via raw Gemini API |
| **Architecture** | Native Claude Code plugin (Node.js) — no extra server process | Separate MCP server (often Python) |
| **Background jobs** | ✅ Fire-and-forget with `/status` `/result` `/cancel` | ❌ Synchronous only |
| **Model routing** | ✅ `--model flash` / `--model pro` | ❌ Usually a single fixed model |
| **Windows support** | ✅ First-class (NVM fallback, dynamic binary discovery) | ⚠️ Unix-focused |
| **Dependencies** | Just Node.js (already required by Claude Code) | Python + pip |
| **Setup** | `claude plugin install` (one command) | clone + install.sh + API key config |

If you're already using `gemini` CLI with your Google account, this plugin gives you Gemini-as-a-worker inside Claude Code with **zero additional cost** and **zero new dependencies**.

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
