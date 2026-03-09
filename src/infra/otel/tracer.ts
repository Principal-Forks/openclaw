/**
 * OpenTelemetry tracer for OpenClaw production instrumentation.
 *
 * This module provides a lazy-loaded tracer that emits spans when OTEL is configured.
 * If OTEL packages aren't available or not configured, all operations are no-ops.
 */

import type { Span, Tracer, SpanStatusCode } from "@opentelemetry/api";

const TRACER_NAME = "openclaw";
const TRACER_VERSION = "1.0.0";

let tracer: Tracer | null = null;
let spanStatusCode: typeof SpanStatusCode | null = null;

/**
 * Initialize the tracer. Call this once during startup if OTEL is enabled.
 */
export async function initTracer(): Promise<void> {
  try {
    const api = await import("@opentelemetry/api");
    tracer = api.trace.getTracer(TRACER_NAME, TRACER_VERSION);
    spanStatusCode = api.SpanStatusCode;
  } catch {
    // OTEL not available, tracer stays null
  }
}

/**
 * Get the tracer instance. Returns null if OTEL is not initialized.
 */
export function getTracer(): Tracer | null {
  return tracer;
}

/**
 * Start a span with attributes.
 * Returns null if OTEL is not initialized.
 */
export function startSpan(
  name: string,
  attributes?: Record<string, string | number | boolean>,
): Span | null {
  if (!tracer) {
    return null;
  }
  return tracer.startSpan(name, { attributes });
}

/**
 * End a span, optionally marking it as error.
 */
export function endSpan(span: Span | null, error?: string): void {
  if (!span) {
    return;
  }
  if (error && spanStatusCode) {
    span.setStatus({ code: spanStatusCode.ERROR, message: error });
  }
  span.end();
}

/**
 * Add an event to a span.
 */
export function addSpanEvent(
  span: Span | null,
  name: string,
  attributes?: Record<string, string | number | boolean>,
): void {
  if (!span) {
    return;
  }
  span.addEvent(name, attributes);
}

/**
 * Set attributes on a span.
 */
export function setSpanAttributes(
  span: Span | null,
  attributes: Record<string, string | number | boolean>,
): void {
  if (!span) {
    return;
  }
  for (const [key, value] of Object.entries(attributes)) {
    span.setAttribute(key, value);
  }
}

/**
 * Execute a function within a span context.
 * The span is automatically ended when the function completes.
 */
export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span | null) => Promise<T>,
): Promise<T> {
  const span = startSpan(name, attributes);
  try {
    const result = await fn(span);
    endSpan(span);
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    endSpan(span, errorMessage);
    throw err;
  }
}

/**
 * Synchronous version of withSpan.
 */
export function withSpanSync<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span | null) => T,
): T {
  const span = startSpan(name, attributes);
  try {
    const result = fn(span);
    endSpan(span);
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    endSpan(span, errorMessage);
    throw err;
  }
}
