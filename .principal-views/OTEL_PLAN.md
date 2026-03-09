# OTEL Canvas Plan

Goal: Create `.otel.canvas` files that capture slices of functionality in the codebase. Traces compose these slices at runtime to reveal the architectural shape.

## Concepts

- **Canvas** - A grouping of related workflows
- **Workflow** - A span representing a slice of functionality, with events and scenarios
- **Events** - Key points within a workflow
- **Scenarios** - Different paths through a workflow (success, error, skip, etc.)
- **Relationships** - Emerge at runtime from traces, not pre-configured in canvas

## Canvas Structure

Each canvas groups workflows that are conceptually related - they often appear together in traces or represent different aspects of the same functional area.

```
canvas
 ├── workflow A (span)
 │    ├── events: [event1, event2, event3]
 │    └── scenarios: [happy-path, error-path, skip-path]
 ├── workflow B (span)
 │    ├── events: [...]
 │    └── scenarios: [...]
 └── workflow C (span)
      └── ...
```

At runtime, traces compose these:

```
trace: [workflow A] → [workflow B] → [workflow C] → ...
```

---

## Proposed Canvases

### 1. `gateway/gateway.otel.canvas` ✓ IMPLEMENTED

Central orchestrator - all requests flow through the gateway.

| Workflow             | Span Name           | Events                                                | Scenarios                  |
| -------------------- | ------------------- | ----------------------------------------------------- | -------------------------- |
| **Request Handling** | `gateway.request`   | `received`, `routed`, `completed`, `error`, `timeout` | success, error, timeout    |
| **Method Dispatch**  | `gateway.method`    | `invoked`, `completed`, `error`, `not-found`          | success, not-found, error  |
| **Lifecycle**        | `gateway.lifecycle` | `starting`, `ready`, `stopped`, `restarting`          | startup, shutdown, restart |

**Instrumentation:**

- `src/infra/otel/tracer.ts` - Base OTEL utilities (lazy-loaded, no-op when not configured)
- `src/infra/otel/gateway.ts` - Typed helpers for gateway spans/events

**Integration points:**

- `handleGatewayRequest()` in `server-methods.ts` → request + method spans
- `startGatewayServer()` / `close()` in `server.impl.ts` → lifecycle spans

**Key files:** `src/gateway/server.impl.ts`, `src/gateway/server-methods.ts`

---

### 2. `channels/channels.otel.canvas`

Messaging platform adapters - inbound and outbound message handling.

| Workflow             | Events                                                        | Scenarios                             |
| -------------------- | ------------------------------------------------------------- | ------------------------------------- |
| **Webhook Handling** | `webhook.received`, `webhook.validated`, `webhook.processed`  | success, invalid-signature, error     |
| **Inbound Message**  | `inbound.received`, `inbound.extracted`, `inbound.dispatched` | processed, filtered, duplicate, error |
| **Outbound Message** | `outbound.queued`, `outbound.chunked`, `outbound.sent`        | success, rate-limited, error          |

**Key files:** `src/telegram/webhook.ts`, `src/channels/`, `src/discord/monitor/`

---

### 3. `message-flow/message-flow.otel.canvas`

Message routing, dispatch, and queue management.

| Workflow               | Events                                                          | Scenarios                            |
| ---------------------- | --------------------------------------------------------------- | ------------------------------------ |
| **Route Resolution**   | `route.resolving`, `route.matched`, `route.resolved`            | bound-agent, default-agent, no-match |
| **Session Management** | `session.derived`, `session.state-change`                       | new-session, existing, expired       |
| **Dispatch**           | `dispatch.started`, `dispatch.processing`, `dispatch.completed` | success, skipped, error              |
| **Queue Operations**   | `queue.enqueued`, `queue.draining`, `queue.drained`             | processed, dropped, timeout          |

**Key files:** `src/routing/`, `src/auto-reply/reply/dispatch-from-config.ts`, `src/auto-reply/reply/queue/`

---

### 4. `agents/agents.otel.canvas`

Agent execution - prompts, LLM calls, tool usage.

| Workflow                | Events                                                          | Scenarios                                      |
| ----------------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| **Agent Run**           | `run.started`, `run.prompt-built`, `run.completed`              | success, cancelled, error                      |
| **LLM Call**            | `llm.requesting`, `llm.streaming`, `llm.completed`              | success, rate-limited, context-exceeded, error |
| **Tool Execution**      | `tool.invoked`, `tool.executing`, `tool.completed`              | success, rejected, loop-detected, error        |
| **Response Generation** | `response.generating`, `response.chunked`, `response.delivered` | success, truncated, error                      |

**Key files:** `src/agents/`, `src/commands/agent.ts`

---

### 5. `config/config.otel.canvas`

Configuration loading, validation, and hot-reload.

| Workflow          | Events                                                       | Scenarios                              |
| ----------------- | ------------------------------------------------------------ | -------------------------------------- |
| **Config Load**   | `config.loading`, `config.parsed`, `config.validated`        | success, parse-error, validation-error |
| **Config Reload** | `reload.triggered`, `reload.diff-computed`, `reload.applied` | success, no-changes, partial, error    |

**Key files:** `src/config/`, `src/gateway/config-reload.ts`

---

### 6. `plugins/plugins.otel.canvas`

Plugin system - registration, lifecycle, hooks.

| Workflow                | Events                                                       | Scenarios                           |
| ----------------------- | ------------------------------------------------------------ | ----------------------------------- |
| **Plugin Registration** | `plugin.discovered`, `plugin.validated`, `plugin.registered` | success, invalid-manifest, conflict |
| **Plugin Lifecycle**    | `plugin.starting`, `plugin.ready`, `plugin.stopping`         | clean, error, timeout               |
| **Hook Execution**      | `hook.triggered`, `hook.executing`, `hook.completed`         | success, skipped, error             |

**Key files:** `src/plugins/`, `src/plugin-sdk/`, `extensions/`

---

## Implementation Order

| Priority | Canvas                                  | Status  | Rationale                          |
| -------- | --------------------------------------- | ------- | ---------------------------------- |
| 1        | `gateway/gateway.otel.canvas`           | ✓ Done  | Foundation - all traces start here |
| 2        | `channels/channels.otel.canvas`         | Pending | Entry/exit points for messages     |
| 3        | `message-flow/message-flow.otel.canvas` | Pending | Core processing pipeline           |
| 4        | `agents/agents.otel.canvas`             | Pending | Agent behavior visibility          |
| 5        | `config/config.otel.canvas`             | Pending | Operational visibility             |
| 6        | `plugins/plugins.otel.canvas`           | Pending | Extension points                   |

---

## Existing Files

- `.principal-views/architecture/architecture.canvas` - High-level component view (not OTEL)
- `.principal-views/message-processing/message-processing.otel.canvas` - Initial attempt, can be refactored into `message-flow` and `channels`
- `.principal-views/library.yaml` - OTEL service resources

---

## Next Steps

1. ~~Create `gateway/gateway.otel.canvas` with workflows~~ ✓
2. ~~Create corresponding `gateway.workflow.json` files for each workflow~~ ✓
3. ~~Validate with CLI~~ ✓
4. ~~Add instrumentation to source code~~ ✓
5. ~~Test with `OTEL_TEST=1 pnpm test`~~ ✓
6. Proceed to `channels/channels.otel.canvas`

## Implementation Notes

### Span Structure

Each workflow = one span. Events are added to the span as it progresses:

```
Span: gateway.request
  Event: gateway.request.received
  Event: gateway.request.routed
  Event: gateway.request.completed (or error/timeout)
```

### OTEL Helpers Pattern

For each canvas, create a typed helper module in `src/infra/otel/<canvas>.ts`:

```typescript
// Start a workflow span with initial event
export function startFooSpan(attrs: FooAttrs): Span | null {
  const span = startSpan("canvas.workflow", { ...attrs });
  addSpanEvent(span, "canvas.workflow.started", { ...attrs });
  return span;
}

// Add intermediate events
export function addFooProgress(span: Span | null, attrs: ProgressAttrs): void {
  addSpanEvent(span, "canvas.workflow.progress", { ...attrs });
}

// End span with terminal event
export function endFooCompleted(span: Span | null, attrs: CompletedAttrs): void {
  addSpanEvent(span, "canvas.workflow.completed", { ...attrs });
  endSpan(span);
}
```

### Testing

Run with OTEL collector:

```bash
# Start collector (optional - spans will be sent but dropped if not running)
docker run -p 4318:4318 otel/opentelemetry-collector

# Run tests with OTEL enabled
OTEL_TEST=1 pnpm test
```

### Grouping Spans Under Tests

By default, spans emitted during tests are orphaned (no parent). To group all spans under a test into a single trace, wrap the test body with `withTestSpan()`:

```typescript
import { withTestSpan } from "../../test/otel-setup.js";

it("my test name", () =>
  withTestSpan("my test name", async () => {
    // All spans created here become children of "test: my test name"
    const server = await startGatewayServer(port);
    // ... test code ...
    await server.close();
  }));
```

**Result in collector:**

```
test: my test name                    ← parent span (from withTestSpan)
  ├── gateway.lifecycle               ← child span
  │     ├── gateway.lifecycle.starting
  │     └── gateway.lifecycle.ready
  ├── gateway.request                 ← child span
  │     ├── gateway.request.received
  │     └── gateway.request.completed
  └── gateway.lifecycle               ← child span
        └── gateway.lifecycle.stopped
```

**Why manual wrapping?** Vitest's `beforeEach`/`afterEach` hooks run in different async contexts than the test body, so automatic wrapping isn't possible. The `withTestSpan()` helper uses OTEL's context propagation to set the parent span for all code executed within the callback.
