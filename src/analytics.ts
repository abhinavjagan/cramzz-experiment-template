export const ANALYTICS_EVENTS = [
  "experiment_view",
  "game_start",
  "game_complete",
  "share_opened",
  "share_completed",
  "challenge_visit",
  "sponsor_cta_clicked",
  "sponsor_form_opened",
  "payment_returned",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
export type AnalyticsValue = string | number | boolean;

const ALLOWED_PROPERTIES = new Set([
  "experiment_id",
  "puzzle_id",
  "source",
  "campaign",
  "referrer_class",
  "returning_player",
  "score",
  "hops",
  "latency_bucket",
  "outcome",
]);

const SAFE_VALUE = /^[\w .:/+-]{1,80}$/u;

export interface AnalyticsEnvelope {
  event: AnalyticsEvent;
  properties: Readonly<Record<string, AnalyticsValue>>;
}

export type AnalyticsSink = (envelope: AnalyticsEnvelope) => void | Promise<void>;

let activeSink: AnalyticsSink = () => undefined;

export function setAnalyticsSink(sink: AnalyticsSink): () => void {
  const previous = activeSink;
  activeSink = sink;
  return () => {
    activeSink = previous;
  };
}

export function sanitizeProperties(
  properties: Record<string, unknown>,
): Record<string, AnalyticsValue> {
  const sanitized: Record<string, AnalyticsValue> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (!ALLOWED_PROPERTIES.has(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) sanitized[key] = value;
    if (typeof value === "boolean") sanitized[key] = value;
    if (typeof value === "string" && SAFE_VALUE.test(value)) sanitized[key] = value;
  }

  return sanitized;
}

export function track(event: AnalyticsEvent, properties: Record<string, unknown> = {}): void {
  const envelope: AnalyticsEnvelope = {
    event,
    properties: Object.freeze(sanitizeProperties(properties)),
  };

  void Promise.resolve(activeSink(envelope)).catch(() => {
    // Analytics must never interrupt the experiment.
  });
}

export function useDomEventSink(): () => void {
  return setAnalyticsSink((envelope) => {
    window.dispatchEvent(new CustomEvent("cramzz:analytics", { detail: envelope }));
  });
}
