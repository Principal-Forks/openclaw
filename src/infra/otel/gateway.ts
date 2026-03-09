/**
 * Gateway OTEL instrumentation.
 *
 * Provides typed helpers for emitting gateway spans as defined in:
 * .principal-views/gateway/gateway.otel.canvas
 */

import type { Span } from "@opentelemetry/api";
import { startSpan, endSpan, addSpanEvent } from "./tracer.js";

// ============================================================================
// Request Handling
// ============================================================================

export interface RequestReceivedAttrs {
  method: string;
  transport: "http" | "websocket" | "internal";
  requestId?: string;
}

export interface RequestRoutedAttrs {
  method: string;
  namespace: string;
}

export interface RequestCompletedAttrs {
  method: string;
  durationMs?: number;
}

export interface RequestErrorAttrs {
  method: string;
  error: string;
  errorCode?: string;
}

export interface RequestTimeoutAttrs {
  method: string;
  timeoutMs?: number;
  durationMs?: number;
}

/**
 * Start a request handling span (workflow: gateway.request).
 */
export function startRequestSpan(attrs: RequestReceivedAttrs): Span | null {
  const span = startSpan("gateway.request", {
    method: attrs.method,
    transport: attrs.transport,
    ...(attrs.requestId ? { requestId: attrs.requestId } : {}),
  });
  // Add the received event
  addSpanEvent(span, "gateway.request.received", {
    method: attrs.method,
    transport: attrs.transport,
    ...(attrs.requestId ? { requestId: attrs.requestId } : {}),
  });
  return span;
}

/**
 * Add request routed event to span.
 */
export function addRequestRouted(span: Span | null, attrs: RequestRoutedAttrs): void {
  addSpanEvent(span, "gateway.request.routed", {
    method: attrs.method,
    namespace: attrs.namespace,
  });
}

/**
 * End request span as completed.
 */
export function endRequestCompleted(span: Span | null, attrs: RequestCompletedAttrs): void {
  addSpanEvent(span, "gateway.request.completed", {
    method: attrs.method,
    ...(attrs.durationMs !== undefined ? { durationMs: attrs.durationMs } : {}),
  });
  endSpan(span);
}

/**
 * End request span as error.
 */
export function endRequestError(span: Span | null, attrs: RequestErrorAttrs): void {
  addSpanEvent(span, "gateway.request.error", {
    method: attrs.method,
    error: attrs.error,
    ...(attrs.errorCode ? { errorCode: attrs.errorCode } : {}),
  });
  endSpan(span, attrs.error);
}

/**
 * End request span as timeout.
 */
export function endRequestTimeout(span: Span | null, attrs: RequestTimeoutAttrs): void {
  addSpanEvent(span, "gateway.request.timeout", {
    method: attrs.method,
    ...(attrs.timeoutMs !== undefined ? { timeoutMs: attrs.timeoutMs } : {}),
    ...(attrs.durationMs !== undefined ? { durationMs: attrs.durationMs } : {}),
  });
  endSpan(span, "timeout");
}

// ============================================================================
// Method Dispatch
// ============================================================================

export interface MethodInvokedAttrs {
  method: string;
  namespace: string;
}

export interface MethodCompletedAttrs {
  method: string;
  durationMs?: number;
}

export interface MethodErrorAttrs {
  method: string;
  error: string;
  durationMs?: number;
}

export interface MethodNotFoundAttrs {
  method: string;
}

/**
 * Start a method dispatch span (workflow: gateway.method).
 */
export function startMethodSpan(attrs: MethodInvokedAttrs): Span | null {
  const span = startSpan("gateway.method", {
    method: attrs.method,
    namespace: attrs.namespace,
  });
  // Add the invoked event
  addSpanEvent(span, "gateway.method.invoked", {
    method: attrs.method,
    namespace: attrs.namespace,
  });
  return span;
}

/**
 * End method span as completed.
 */
export function endMethodCompleted(span: Span | null, attrs: MethodCompletedAttrs): void {
  addSpanEvent(span, "gateway.method.completed", {
    method: attrs.method,
    ...(attrs.durationMs !== undefined ? { durationMs: attrs.durationMs } : {}),
  });
  endSpan(span);
}

/**
 * End method span as error.
 */
export function endMethodError(span: Span | null, attrs: MethodErrorAttrs): void {
  addSpanEvent(span, "gateway.method.error", {
    method: attrs.method,
    error: attrs.error,
    ...(attrs.durationMs !== undefined ? { durationMs: attrs.durationMs } : {}),
  });
  endSpan(span, attrs.error);
}

/**
 * Emit method not found span (workflow: gateway.method, scenario: not-found).
 */
export function emitMethodNotFound(attrs: MethodNotFoundAttrs): void {
  const span = startSpan("gateway.method", {
    method: attrs.method,
  });
  addSpanEvent(span, "gateway.method.not-found", {
    method: attrs.method,
  });
  endSpan(span, "method not found");
}

// ============================================================================
// Lifecycle
// ============================================================================

export interface LifecycleStartingAttrs {
  port?: number;
  mode?: "local" | "remote";
}

export interface LifecycleReadyAttrs {
  port?: number;
  channels?: number;
  startupMs?: number;
}

export interface LifecycleStoppedAttrs {
  reason?: string;
  uptimeMs?: number;
}

export interface LifecycleRestartingAttrs {
  reason?: string;
  uptimeMs?: number;
}

/**
 * Start gateway lifecycle span (workflow: gateway.lifecycle, scenario: startup).
 */
export function emitGatewayStarting(attrs: LifecycleStartingAttrs): Span | null {
  const span = startSpan("gateway.lifecycle", {
    ...(attrs.port !== undefined ? { port: attrs.port } : {}),
    ...(attrs.mode ? { mode: attrs.mode } : {}),
  });
  addSpanEvent(span, "gateway.lifecycle.starting", {
    ...(attrs.port !== undefined ? { port: attrs.port } : {}),
    ...(attrs.mode ? { mode: attrs.mode } : {}),
  });
  return span;
}

/**
 * Emit gateway ready event (ends the starting span).
 */
export function emitGatewayReady(span: Span | null, attrs: LifecycleReadyAttrs): void {
  addSpanEvent(span, "gateway.lifecycle.ready", {
    ...(attrs.port !== undefined ? { port: attrs.port } : {}),
    ...(attrs.channels !== undefined ? { channels: attrs.channels } : {}),
    ...(attrs.startupMs !== undefined ? { startupMs: attrs.startupMs } : {}),
  });
  endSpan(span);
}

/**
 * Emit gateway stopped span (workflow: gateway.lifecycle, scenario: shutdown).
 */
export function emitGatewayStopped(attrs: LifecycleStoppedAttrs): void {
  const span = startSpan("gateway.lifecycle", {
    ...(attrs.reason ? { reason: attrs.reason } : {}),
    ...(attrs.uptimeMs !== undefined ? { uptimeMs: attrs.uptimeMs } : {}),
  });
  addSpanEvent(span, "gateway.lifecycle.stopped", {
    ...(attrs.reason ? { reason: attrs.reason } : {}),
    ...(attrs.uptimeMs !== undefined ? { uptimeMs: attrs.uptimeMs } : {}),
  });
  endSpan(span);
}

/**
 * Emit gateway restarting span (workflow: gateway.lifecycle, scenario: restart).
 */
export function emitGatewayRestarting(attrs: LifecycleRestartingAttrs): void {
  const span = startSpan("gateway.lifecycle", {
    ...(attrs.reason ? { reason: attrs.reason } : {}),
    ...(attrs.uptimeMs !== undefined ? { uptimeMs: attrs.uptimeMs } : {}),
  });
  addSpanEvent(span, "gateway.lifecycle.restarting", {
    ...(attrs.reason ? { reason: attrs.reason } : {}),
    ...(attrs.uptimeMs !== undefined ? { uptimeMs: attrs.uptimeMs } : {}),
  });
  endSpan(span);
}
