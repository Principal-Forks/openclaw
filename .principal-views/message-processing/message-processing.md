# Message Processing Flow

This canvas documents the OpenTelemetry events emitted during message processing in OpenClaw.

## Overview

When a message arrives via a messaging channel (Telegram, Discord, Slack, etc.), OpenClaw emits a sequence of diagnostic events that can be exported to an OTEL collector for observability.

## Event Flow

```
webhook.received
       │
       ├──────────────────► webhook.error (early failure)
       │
       ▼
message.queued
       │
       ├─────► message.processed (outcome: completed)
       │                │
       │                ▼
       │         webhook.processed
       │
       ├─────► message.processed (outcome: skipped)
       │
       └─────► message.processed (outcome: error)
```

## Events

### webhook.received

Emitted when an inbound webhook is received from a messaging channel.

| Attribute  | Type   | Required | Description                                         |
| ---------- | ------ | -------- | --------------------------------------------------- |
| channel    | string | yes      | Channel identifier (telegram, discord, slack, etc.) |
| updateType | string | no       | Type of update (message, callback_query, etc.)      |
| chatId     | string | no       | Chat/conversation identifier                        |

### message.queued

Emitted when a message is enqueued for processing.

| Attribute  | Type   | Required | Description                                |
| ---------- | ------ | -------- | ------------------------------------------ |
| channel    | string | no       | Channel identifier                         |
| source     | string | yes      | Source of the message (webhook, api, etc.) |
| sessionKey | string | no       | Session key for routing                    |
| sessionId  | string | no       | Session identifier                         |
| queueDepth | number | no       | Current queue depth after enqueue          |

### message.processed

Emitted when message processing completes (success, skip, or error).

| Attribute  | Type   | Required | Description                                   |
| ---------- | ------ | -------- | --------------------------------------------- |
| channel    | string | yes      | Channel identifier                            |
| outcome    | string | yes      | Processing outcome: completed, skipped, error |
| messageId  | string | no       | Message identifier                            |
| chatId     | string | no       | Chat/conversation identifier                  |
| sessionKey | string | no       | Session key                                   |
| sessionId  | string | no       | Session identifier                            |
| durationMs | number | no       | Processing duration in milliseconds           |
| reason     | string | no       | Reason for skipping (when outcome=skipped)    |
| error      | string | no       | Error message (when outcome=error)            |

### webhook.processed

Emitted when webhook handling completes successfully.

| Attribute  | Type   | Required | Description                       |
| ---------- | ------ | -------- | --------------------------------- |
| channel    | string | yes      | Channel identifier                |
| updateType | string | no       | Type of update processed          |
| chatId     | string | no       | Chat/conversation identifier      |
| durationMs | number | no       | Total webhook processing duration |

### webhook.error

Emitted when webhook handling fails at an early stage.

| Attribute  | Type   | Required | Description                  |
| ---------- | ------ | -------- | ---------------------------- |
| channel    | string | yes      | Channel identifier           |
| updateType | string | no       | Type of update               |
| chatId     | string | no       | Chat/conversation identifier |
| error      | string | yes      | Error message                |

## Configuration

To enable OTEL export, configure the diagnostics-otel extension:

```yaml
diagnostics:
  enabled: true
  otel:
    enabled: true
    endpoint: "http://localhost:4318"
    traces: true
    metrics: true
    logs: false
```

## Related Files

- `src/infra/diagnostic-events.ts` - Event type definitions
- `extensions/diagnostics-otel/src/service.ts` - OTEL exporter implementation
