# Tensora 💀

> A terminal AI coding assistant with multi-API support. Claude Code, but make it chaotic.

![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
![License](https://img.shields.io/badge/license-MIT-red)

## Features

- 🔄 **API Switching** — Switch between Groq and Mistral on the fly
- 💬 **Streaming responses** — Real-time token streaming
- 📁 **File operations** — Read, write, and list files
- 🐚 **Shell commands** — Execute commands in your project
- 🧠 **Context awareness** — Understands your project structure
- 📱 **Zero bloat** — No external API dependencies, just Node.js

## Install

```bash
# Clone or download, then:
npm install
npm link  # Makes `tensora` and `ten` available globally
```

Or run directly:
```bash
node src/index.js
```

## Setup

On first run, Tensora creates `~/.tensora.json`. Add your API keys:

```json
{
  "defaultProvider": "groq",
  "groqKey": "gsk_your_key_here",
  "groqModel": "llama3-8b-8192",
  "mistralKey": "your_mistral_key_here",
  "mistralModel": "mistral-tiny"
}
```

Get your keys:
- **Groq**: https://console.groq.com/keys
- **Mistral**: https://console.mistral.ai/api-keys

## Usage

```bash
# Start interactive mode
tensora

# Or with an initial prompt
tensora "explain this codebase"

# Change working directory
tensora -d /path/to/project "review my code"

# Short alias
ten
```

### Commands

| Command | Description |
|---------|-------------|
| `/help` | Show all commands |
| `/switch <provider>` | Switch API (groq/mistral) |
| `/model <name>` | Change AI model |
| `/reset` | Clear conversation |
| `/clear` | Clear screen |
| `/ls [path]` | List files |
| `/cat <file>` | Read file |
| `/pwd` | Show current directory |
| `/git` | Git status |
| `/config` | Show configuration |
| `/quit` | Exit Tensora |

### API Switching

```
tensora[groq] > /switch mistral
Switched to mistral — mistral-tiny

tensora[mistral] > /switch groq
Switched to groq — llama3-8b-8192

tensora[groq] > /model mixtral-8x7b-32768
Model set to mixtral-8x7b-32768
```

### Supported Models

**Groq:**
- `llama3-8b-8192`
- `llama3-70b-8192`
- `mixtral-8x7b-32768`
- `gemma-7b-it`
- `llama-3.1-8b-instant`
- `llama-3.3-70b-versatile`

**Mistral:**
- `mistral-tiny`
- `mistral-small`
- `mistral-medium`
- `mistral-large-latest`
- `codestral-latest`

## Architecture

```
tensora/
├── src/
│   ├── index.js          # CLI entry point
│   ├── cli.js            # Interactive terminal
│   ├── config.js         # Config management
│   ├── api/
│   │   ├── router.js     # API switching
│   │   ├── groq.js       # Groq provider
│   │   └── mistral.js    # Mistral provider
│   └── tools/
│       ├── files.js      # File operations
│       ├── shell.js      # Shell execution
│       └── context.js    # Project awareness
├── package.json
└── README.md
```

## License

MIT — use it, break it, make it yours 💀
