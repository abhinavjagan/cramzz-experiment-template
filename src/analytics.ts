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

export const ANALYTICS_PROPERTIES = [
  "experiment_id",
  "puzzle_id",
  "source",
  "campaign",
  "referrer_class",
  "returning_player",
  "outcome",
  "latency_ms",
  "reliability_pct",
  "hops",
  "grade",
] as const;

const ALLOWED_PROPERTIES = new Set<string>(ANALYTICS_PROPERTIES);
const SAFE_TOKEN = /^[A-Za-z0-9._-]+$/;
const REFERRER_CLASSES = new Set(["direct", "internal", "search", "social", "referral"]);
const OUTCOMES = new Set(["delivered", "dropped"]);
const GRADES = new Set(["S", "A", "B", "C", "D"]);
const ANALYTICS_ID_KEY = "cramzz.analytics.anonymous-id.v1";
const ANALYTICS_ID_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const APPROVED_POSTHOG_ORIGINS = new Set(["https://us.i.posthog.com", "https://eu.i.posthog.com"]);

export interface AnalyticsProperties {
  experiment_id?: string;
  puzzle_id?: string;
  source?: string;
  campaign?: string;
  referrer_class?: "direct" | "internal" | "search" | "social" | "referral";
  returning_player?: boolean;
  outcome?: "delivered" | "dropped";
  latency_ms?: number;
  reliability_pct?: number;
  hops?: number;
  grade?: "S" | "A" | "B" | "C" | "D";
}

export interface AnalyticsEnvelope {
  event: AnalyticsEvent;
  properties: Readonly<AnalyticsProperties>;
}

export type AnalyticsSink = (envelope: AnalyticsEnvelope) => void | Promise<void>;

interface PrivacySignals {
  doNotTrack?: string | null;
  globalPrivacyControl?: boolean;
}

interface DirectPostHogOptions {
  production: boolean;
  key?: string;
  host?: string;
  fetcher?: typeof fetch;
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  now?: () => number;
  createId?: () => string;
  privacySignals?: PrivacySignals;
}

export interface AnalyticsTransport {
  send: (event: AnalyticsEvent, properties: AnalyticsProperties) => Promise<void>;
}

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
): AnalyticsProperties {
  const sanitized: Record<string, AnalyticsValue> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (!ALLOWED_PROPERTIES.has(key)) continue;
    if (["experiment_id", "puzzle_id", "source", "campaign"].includes(key)) {
      const token = safeToken(value);
      if (token) sanitized[key] = token;
      continue;
    }
    if (key === "referrer_class" && typeof value === "string" && REFERRER_CLASSES.has(value)) {
      sanitized[key] = value;
      continue;
    }
    if (key === "outcome" && typeof value === "string" && OUTCOMES.has(value)) {
      sanitized[key] = value;
      continue;
    }
    if (key === "grade" && typeof value === "string" && GRADES.has(value)) {
      sanitized[key] = value;
      continue;
    }
    if (key === "returning_player" && typeof value === "boolean") {
      sanitized[key] = value;
      continue;
    }
    const maximum = key === "reliability_pct" ? 100 : key === "hops" ? 6 : key === "latency_ms" ? 10_000 : -1;
    if (maximum >= 0 && typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum) {
      if (key !== "hops" || Number.isInteger(value)) sanitized[key] = value;
    }
  }

  return sanitized as AnalyticsProperties;
}

function safeToken(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > 64 || !SAFE_TOKEN.test(normalized)) return undefined;
  return normalized;
}

export function analyticsOptedOut(signals: PrivacySignals): boolean {
  return signals.doNotTrack === "1" || signals.doNotTrack === "yes" || signals.globalPrivacyControl === true;
}

export function getRotatingAnonymousId(
  storage: Pick<Storage, "getItem" | "setItem"> | null,
  now: number,
  createId: () => string,
): string {
  if (storage) {
    try {
      const saved = JSON.parse(storage.getItem(ANALYTICS_ID_KEY) ?? "null") as { id?: unknown; createdAt?: unknown } | null;
      const validId = typeof saved?.id === "string" && /^anon_[A-Za-z0-9-]{16,64}$/.test(saved.id);
      const validTimestamp = typeof saved?.createdAt === "number"
        && Number.isFinite(saved.createdAt)
        && saved.createdAt <= now
        && now - saved.createdAt < ANALYTICS_ID_TTL_MS;
      if (validId && validTimestamp) return saved.id as string;
    } catch {
      // A blocked or corrupt store falls through to a new anonymous ID.
    }
  }

  const generatedId = createId();
  const id = /^anon_[A-Za-z0-9-]{16,64}$/.test(generatedId) ? generatedId : createAnonymousId();
  if (storage) {
    try {
      storage.setItem(ANALYTICS_ID_KEY, JSON.stringify({ id, createdAt: now }));
    } catch {
      // Keep a page-lifetime ID when storage is blocked.
    }
  }
  return id;
}

export function createDirectPostHogTransport(options: DirectPostHogOptions): AnalyticsTransport | null {
  const key = options.key?.trim();
  const host = options.host?.trim();
  if (!options.production || !key || !host) return null;

  const signals = options.privacySignals
    ?? (typeof navigator === "undefined" ? {} : navigator as Navigator & PrivacySignals);
  if (analyticsOptedOut(signals)) return null;

  let endpoint: URL;
  try {
    endpoint = new URL(host);
    if (!APPROVED_POSTHOG_ORIGINS.has(endpoint.origin) || endpoint.username || endpoint.password) return null;
    endpoint.pathname = "/i/v0/e/";
    endpoint.search = "";
    endpoint.hash = "";
  } catch {
    return null;
  }

  let storage = options.storage;
  if (storage === undefined) {
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
  }
  const distinctId = getRotatingAnonymousId(
    storage,
    (options.now ?? Date.now)(),
    options.createId ?? createAnonymousId,
  );
  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);

  return {
    async send(event, properties): Promise<void> {
      try {
        await fetcher(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          referrerPolicy: "no-referrer",
          keepalive: true,
          body: JSON.stringify({
            api_key: key,
            event,
            distinct_id: distinctId,
            properties: {
              ...sanitizeProperties(properties as Record<string, unknown>),
              $process_person_profile: false,
              $geoip_disable: true,
            },
          }),
        });
      } catch {
        // Analytics must never interrupt the experiment, including while offline.
      }
    },
  };
}

function createAnonymousId(): string {
  if (typeof crypto.randomUUID === "function") return `anon_${crypto.randomUUID()}`;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `anon_${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

const directPostHog = typeof window === "undefined"
  ? null
  : createDirectPostHogTransport({
      production: import.meta.env.PROD,
      key: import.meta.env.VITE_POSTHOG_KEY,
      host: import.meta.env.VITE_POSTHOG_HOST,
    });

export function track(event: AnalyticsEvent, properties: Record<string, unknown> = {}): void {
  const envelope: AnalyticsEnvelope = {
    event,
    properties: Object.freeze(sanitizeProperties(properties)),
  };

  void Promise.resolve(activeSink(envelope)).catch(() => {
    // Analytics must never interrupt the experiment.
  });
  void directPostHog?.send(event, envelope.properties);
}

export function useDomEventSink(): () => void {
  return setAnalyticsSink((envelope) => {
    window.dispatchEvent(new CustomEvent("cramzz:analytics", { detail: envelope }));
  });
}
