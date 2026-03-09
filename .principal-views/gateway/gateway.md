# Gateway OTEL Events

The gateway is the central orchestrator of OpenClaw. All requests flow through it, making it the foundation for tracing.

## Workflows

### Request Handling

Captures the lifecycle of a gateway request from receipt to completion.

**Events:**

- `gateway.request.received` - Request arrives via HTTP, WebSocket, or internal RPC
  - `method`, `transport`, `requestId`
- `gateway.request.routed` - Request matched to a method handler
  - `method`, `namespace`
- `gateway.request.completed` - Request completed successfully
  - `method`, `durationMs`
- `gateway.request.error` - Request failed with an error
  - `method`, `error`, `errorCode`
- `gateway.request.timeout` - Request timed out
  - `method`, `timeoutMs`, `durationMs`

**Scenarios:**

- `success` - Request processed successfully
- `error` - Request failed with an error
- `timeout` - Request timed out

### Method Dispatch

Captures RPC method handler invocation and completion.

**Events:**

- `gateway.method.invoked` - Method handler called
  - `method`, `namespace`
- `gateway.method.completed` - Method handler finished successfully
  - `method`, `durationMs`
- `gateway.method.error` - Method handler failed
  - `method`, `error`, `durationMs`
- `gateway.method.not-found` - Requested method does not exist
  - `method`

**Scenarios:**

- `success` - Method executed successfully
- `not-found` - Method does not exist
- `error` - Method execution failed

### Lifecycle

Captures gateway server startup, ready, and shutdown events.

**Events:**

- `gateway.lifecycle.starting` - Gateway is initializing
  - `port`, `mode`
- `gateway.lifecycle.ready` - Gateway is ready to accept requests
  - `port`, `channels`, `startupMs`
- `gateway.lifecycle.stopped` - Gateway has stopped
  - `reason`, `uptimeMs`
- `gateway.lifecycle.restarting` - Gateway is restarting
  - `reason`, `uptimeMs`

**Scenarios:**

- `startup` - Normal startup to ready state
- `shutdown` - Gateway shut down
- `restart` - Gateway restarting

## Instrumentation

The gateway OTEL instrumentation lives in `src/infra/otel/`:

- `tracer.ts` - Base OTEL utilities (lazy-loaded tracer, no-op when OTEL not configured)
- `gateway.ts` - Typed helpers for gateway spans and events

### Span Structure

Each workflow corresponds to a single span. Events are added to the span as it progresses through scenarios:

```
Span: gateway.request
  Event: gateway.request.received    (on entry)
  Event: gateway.request.routed      (after auth, matched to handler)
  Event: gateway.request.completed   (success scenario)
         — or —
  Event: gateway.request.error       (error scenario)
         — or —
  Event: gateway.request.timeout     (timeout scenario)
```

### Integration Points

| Workflow            | Instrumented In                                        |
| ------------------- | ------------------------------------------------------ |
| `gateway.request`   | `handleGatewayRequest()` in `server-methods.ts`        |
| `gateway.method`    | `handleGatewayRequest()` in `server-methods.ts`        |
| `gateway.lifecycle` | `startGatewayServer()` / `close()` in `server.impl.ts` |

### Testing

Enable OTEL in tests with `OTEL_TEST=1`. Spans are exported to `http://localhost:4318`.

To group spans under a test, wrap with `withTestSpan()`:

```typescript
import { withTestSpan } from "../../test/otel-setup.js";

it("my test", () =>
  withTestSpan("my test", async () => {
    // spans here are children of "test: my test"
  }));
```

## Key Files

- `src/gateway/server.impl.ts` - Gateway server implementation (lifecycle spans)
- `src/gateway/server-methods.ts` - Method registry and dispatch (request/method spans)
- `src/gateway/server-methods/` - Individual method handlers
- `src/infra/otel/gateway.ts` - Gateway OTEL helpers

## Method Namespaces

The gateway exposes 20+ method namespaces:

| Namespace          | Purpose                       |
| ------------------ | ----------------------------- |
| `agent.*`          | Agent execution and lifecycle |
| `chat.*`           | Message routing and chat      |
| `channels.*`       | Channel management            |
| `config.*`         | Configuration CRUD            |
| `connect.*`        | Client connection handling    |
| `health.*`         | System health                 |
| `send.*`           | Message sending               |
| `models.*`         | LLM model management          |
| `browser.*`        | Browser automation            |
| `cron.*`           | Scheduled tasks               |
| `devices.*`        | Device management             |
| `exec-approvals.*` | Execution approvals           |
| `logs.*`           | Log streaming                 |
| `nodes.*`          | Node management               |
| `push.*`           | Push notifications            |
| `sessions.*`       | Session management            |
| `skills.*`         | Skill invocation              |
| `system.*`         | System operations             |
| `tts.*`            | Text-to-speech                |
| `web.*`            | Web interface                 |
| `wizard.*`         | Setup wizard                  |
