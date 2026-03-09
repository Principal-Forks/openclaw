# OpenClaw Architecture

OpenClaw is a multi-channel AI gateway that routes messages between messaging platforms and AI agents.

## Core Components

### CLI (`src/cli/`, `src/commands/`)

Commander-based entry point. Commands include `agent`, `channels`, `config`, `gateway`, `send`, etc.

### Gateway Server (`src/gateway/`)

Central orchestrator that:

- Manages channel plugin lifecycle
- Routes inbound messages to agents
- Handles 20+ RPC method namespaces
- Supports WebSocket, HTTP, and Tailscale connections

### Channel Plugins (`src/channels/`, `src/telegram/`, `src/discord/`, etc.)

Adapters for messaging platforms. Each plugin implements:

- **Config** - Settings and validation
- **Messaging** - Send/receive messages
- **Outbound** - Route responses back
- **Auth** - Platform authentication
- **Status** - Health probes

Built-in: Telegram, Discord, Slack, Signal, iMessage, WhatsApp, Line
Extensions: MS Teams, Matrix, BlueBubbles, Zalo, etc.

### Routing (`src/routing/`)

Resolves inbound messages to agent destinations:

- Session key derivation: `agent-<id>:<channel>:<account>:<peer>`
- Binding configurations for fine-grained routing
- Role-based routing (Discord)

### Agents (`src/agents/`)

AI agent execution:

- Local (Node.js) or remote (Pi platform)
- Prompt handling and tool use
- Streaming responses
- Sub-agent spawning

### Auto-Reply (`src/auto-reply/`)

Message processing pipeline:

- Queue management with drop policies
- Reply formatting and chunking
- Heartbeat handling
- Duplicate detection

### Config (`src/config/`)

JSON5 configuration with:

- Agent definitions and bindings
- Channel credentials
- Provider settings
- Hot-reload support

### Plugin System (`src/plugins/`, `extensions/`)

Extensible runtime:

- Plugin SDK with typed interfaces
- Request-scoped isolation
- Service lifecycle hooks

### Diagnostics (`src/infra/diagnostic-events.ts`)

Event bus for observability:

- `webhook.received/processed/error`
- `message.queued/processed`
- `session.state`
- Subscriber pattern for extensions

## Message Flow

```
External Platform
       │
       ▼ webhook
┌─────────────┐
│  Channels   │ ─────────────┐
└─────────────┘              │
       │                     │
       ▼ inbound             │
┌─────────────┐              │
│   Gateway   │              │
└─────────────┘              │
       │                     │
       ▼ resolve             │
┌─────────────┐              │
│   Routing   │              │
└─────────────┘              │
       │                     │
       ▼ dispatch            │
┌─────────────┐              │
│ Auto-Reply  │              │
└─────────────┘              │
       │                     │
       ▼ execute             │
┌─────────────┐              │
│   Agents    │ ◀── LLM API  │
└─────────────┘              │
       │                     │
       ▼ response            │
┌─────────────┐              │
│ Auto-Reply  │              │
└─────────────┘              │
       │                     │
       ▼ outbound            │
┌─────────────┐              │
│  Channels   │ ◀────────────┘
└─────────────┘
       │
       ▼
External Platform
```

## Key Files

| Component   | Primary Files                                                 |
| ----------- | ------------------------------------------------------------- |
| Entry       | `src/entry.ts`, `src/cli/program.ts`                          |
| Gateway     | `src/gateway/server.impl.ts`, `src/gateway/server-methods.ts` |
| Channels    | `src/channels/plugins/types.ts`, `src/telegram/webhook.ts`    |
| Routing     | `src/routing/resolve-route.ts`, `src/routing/session-key.ts`  |
| Auto-Reply  | `src/auto-reply/reply/dispatch-from-config.ts`                |
| Agents      | `src/agents/`, `src/commands/agent.ts`                        |
| Diagnostics | `src/infra/diagnostic-events.ts`, `src/logging/diagnostic.ts` |
