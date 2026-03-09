/**
 * OpenTelemetry test setup for OpenClaw
 *
 * This module configures OTEL to send telemetry to a local collector.
 * Enable with OTEL_TEST=1 env var.
 *
 * Prerequisites:
 * - OTEL collector running at http://localhost:4318
 * - Start with: docker run -p 4318:4318 otel/opentelemetry-collector
 */

import type { Tracer, Span } from "@opentelemetry/api";
import type { NodeSDK } from "@opentelemetry/sdk-node";

const TRACER_NAME = "openclaw-test";
const TRACER_VERSION = "1.0.0";

let sdk: NodeSDK | null = null;
let tracer: Tracer | null = null;
let otelApi: typeof import("@opentelemetry/api") | null = null;

export const OTEL_TEST_ENABLED = process.env.OTEL_TEST === "1";

export interface OTELSetupOptions {
  endpoint?: string;
  serviceName?: string;
}

/**
 * Get the test tracer for creating spans directly.
 * Returns null if OTEL is not enabled.
 */
export function getTestTracer(): Tracer | null {
  return tracer;
}

/**
 * Create a span for test instrumentation.
 * No-op if OTEL is not enabled.
 */
export function startTestSpan(
  name: string,
  attributes?: Record<string, string | number | boolean>,
): Span | null {
  if (!tracer) {
    return null;
  }
  const span = tracer.startSpan(name);
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      span.setAttribute(key, value);
    }
  }
  return span;
}

/**
 * Set up OpenTelemetry - only runs if OTEL_TEST=1
 */
export async function setupOTEL(options: OTELSetupOptions = {}): Promise<void> {
  if (!OTEL_TEST_ENABLED) {
    return;
  }

  const endpoint = options.endpoint ?? "http://localhost:4318";
  const serviceName = options.serviceName ?? "openclaw-test";

  try {
    // Dynamic imports - may fail if modules are mocked by vi.mock()
    const [
      { OTLPTraceExporter },
      { OTLPMetricExporter },
      { resourceFromAttributes },
      { PeriodicExportingMetricReader },
      { NodeSDK: NodeSDKClass },
      semanticConventions,
      otelApiModule,
    ] = (await Promise.all([
      import("@opentelemetry/exporter-trace-otlp-proto"),
      import("@opentelemetry/exporter-metrics-otlp-proto"),
      import("@opentelemetry/resources"),
      import("@opentelemetry/sdk-metrics"),
      import("@opentelemetry/sdk-node"),
      import("@opentelemetry/semantic-conventions"),
      import("@opentelemetry/api"),
    ])) as [
      typeof import("@opentelemetry/exporter-trace-otlp-proto"),
      typeof import("@opentelemetry/exporter-metrics-otlp-proto"),
      typeof import("@opentelemetry/resources"),
      typeof import("@opentelemetry/sdk-metrics"),
      typeof import("@opentelemetry/sdk-node"),
      typeof import("@opentelemetry/semantic-conventions"),
      typeof import("@opentelemetry/api"),
    ];

    // Handle both old and new semantic-conventions API
    const ATTR_SERVICE_NAME = semanticConventions.ATTR_SERVICE_NAME ?? "service.name";
    const ATTR_SERVICE_VERSION = semanticConventions.ATTR_SERVICE_VERSION ?? "service.version";

    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: TRACER_VERSION,
      "library.name": TRACER_NAME,
      "test.framework": "vitest",
    });

    const traceExporter = new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });
    const metricExporter = new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` });

    sdk = new NodeSDKClass({
      resource,
      traceExporter,
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 1000,
      }),
    });

    sdk.start();

    // Store API reference for context propagation
    otelApi = otelApiModule;

    // Get the tracer after SDK is started
    tracer = otelApiModule.trace.getTracer(TRACER_NAME, TRACER_VERSION);

    // Emit a test span to verify the pipeline works
    const initSpan = tracer.startSpan("test.otel.init", {
      attributes: {
        "test.framework": "vitest",
        "service.name": serviceName,
      },
    });
    initSpan.end();

    process.stderr.write(`[OTEL] Test telemetry enabled, exporting to ${endpoint}\n`);
  } catch (err) {
    process.stderr.write(`[OTEL] Setup failed: ${String(err)}\n`);
  }
}

/**
 * Shutdown OpenTelemetry and flush pending spans
 */
export async function shutdownOTEL(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    tracer = null;
    otelApi = null;
    process.stderr.write("[OTEL] Tracer shut down\n");
  }
}

/**
 * Run a test function within a parent span context.
 * All spans created by production code during the test will be children of this span.
 *
 * Usage:
 * ```ts
 * it("my test", () => withTestSpan("my test", async () => {
 *   // test code here - all spans will be grouped under "test: my test"
 * }));
 * ```
 */
export async function withTestSpan<T>(
  testName: string,
  fn: () => Promise<T> | T,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  if (!tracer || !otelApi) {
    // OTEL not enabled, just run the function
    return await fn();
  }

  const span = tracer.startSpan(`test: ${testName}`, {
    attributes: {
      "test.name": testName,
      "test.framework": "vitest",
      ...attributes,
    },
  });

  // Create a context with this span as active
  const ctx = otelApi.trace.setSpan(otelApi.context.active(), span);

  try {
    // Run the test function within the span context
    const result = await otelApi.context.with(ctx, async () => {
      return await fn();
    });
    span.setStatus({ code: otelApi.SpanStatusCode.OK });
    return result;
  } catch (err) {
    span.setStatus({
      code: otelApi.SpanStatusCode.ERROR,
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    span.end();
  }
}
