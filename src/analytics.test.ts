import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, describe, it } from "node:test";
import {
  ANALYTICS_EVENTS,
  ANALYTICS_PROPERTIES,
  analyticsOptedOut,
  createDirectPostHogTransport,
  getRotatingAnonymousId,
  sanitizeProperties,
  setAnalyticsSink,
  track,
} from "./analytics";

let restore: (() => void) | undefined;

afterEach(() => {
  restore?.();
  restore = undefined;
});

describe("anonymous analytics", () => {
  it("keeps only explicitly allowed and per-field validated values", () => {
    assert.deepEqual(
      sanitizeProperties({
        experiment_id: "cramzz-exp-example",
        puzzle_id: "2026-09-20",
        source: "launch_post",
        campaign: "season-1",
        referrer_class: "social",
        returning_player: true,
        outcome: "delivered",
        latency_ms: 418,
        reliability_pct: 97.2,
        hops: 6,
        grade: "A",
        email: "someone@example.com",
      }),
      {
        experiment_id: "cramzz-exp-example",
        puzzle_id: "2026-09-20",
        source: "launch_post",
        campaign: "season-1",
        referrer_class: "social",
        returning_player: true,
        outcome: "delivered",
        latency_ms: 418,
        reliability_pct: 97.2,
        hops: 6,
        grade: "A",
      },
    );
  });

  it("rejects free-form identifiers and unknown or sensitive fields", () => {
    assert.deepEqual(sanitizeProperties({
      experiment_id: "x".repeat(65),
      puzzle_id: "2026/09/20",
      source: "someone@example.com",
      campaign: "launch campaign",
      email: "someone@example.com",
      full_name: "Someone",
      browser: "Firefox",
    }), {});
  });

  it("enumerates categorical values and bounds every numeric field", () => {
    assert.deepEqual(sanitizeProperties({
      referrer_class: "email",
      outcome: "maybe",
      grade: "S+",
      returning_player: "yes",
      latency_ms: -1,
      reliability_pct: 100.1,
      hops: 6.5,
    }), {});

    assert.deepEqual(sanitizeProperties({
      referrer_class: "direct",
      outcome: "dropped",
      grade: "D",
      returning_player: false,
      latency_ms: 10_000,
      reliability_pct: 100,
      hops: 6,
    }), {
      referrer_class: "direct",
      outcome: "dropped",
      grade: "D",
      returning_player: false,
      latency_ms: 10_000,
      reliability_pct: 100,
      hops: 6,
    });
  });

  it("sends a manually named event to the configured sink", () => {
    const received: unknown[] = [];
    const sink = (envelope: unknown) => {
      received.push(envelope);
    };
    restore = setAnalyticsSink(sink);

    track("experiment_view", { experiment_id: "cramzz-exp-example" });

    assert.deepEqual(received, [
      {
        event: "experiment_view",
        properties: { experiment_id: "cramzz-exp-example" },
      },
    ]);
  });

  it("keeps development, incomplete, and unapproved PostHog configurations network-silent", () => {
    assert.equal(createDirectPostHogTransport({
      production: false,
      key: "phc_public",
      host: "https://us.i.posthog.com",
    }), null);
    assert.equal(createDirectPostHogTransport({
      production: true,
      host: "https://us.i.posthog.com",
    }), null);
    assert.equal(createDirectPostHogTransport({
      production: true,
      key: "phc_public",
      host: "http://us.i.posthog.com",
    }), null);
    assert.equal(createDirectPostHogTransport({
      production: true,
      key: "phc_public",
      host: "https://us.i.posthog.com.attacker.example",
    }), null);
  });

  it("sends a sanitized anonymous event only to the approved ingestion path", async () => {
    const requests: Array<{ input: string; init?: RequestInit }> = [];
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ input: String(input), init });
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    const transport = createDirectPostHogTransport({
      production: true,
      key: "phc_public",
      host: "https://eu.i.posthog.com/untrusted/path?ignored=yes",
      fetcher,
      storage: memoryStorage(),
      now: () => 1_000,
      createId: () => "anon_1234567890abcdef",
      privacySignals: {},
    });

    assert.ok(transport);
    await transport.send("game_complete", {
      outcome: "delivered",
      hops: 4,
      source: "person@example.com",
    } as never);

    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.input, "https://eu.i.posthog.com/i/v0/e/");
    assert.equal(requests[0]?.init?.credentials, "omit");
    assert.equal(requests[0]?.init?.referrerPolicy, "no-referrer");
    assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), {
      api_key: "phc_public",
      event: "game_complete",
      distinct_id: "anon_1234567890abcdef",
      properties: {
        outcome: "delivered",
        hops: 4,
        $process_person_profile: false,
        $geoip_disable: true,
      },
    });
  });

  it("respects DNT and Global Privacy Control", () => {
    assert.equal(analyticsOptedOut({ doNotTrack: "1" }), true);
    assert.equal(analyticsOptedOut({ doNotTrack: "yes" }), true);
    assert.equal(analyticsOptedOut({ globalPrivacyControl: true }), true);
    assert.equal(analyticsOptedOut({ doNotTrack: "0", globalPrivacyControl: false }), false);
    assert.equal(createDirectPostHogTransport({
      production: true,
      key: "phc_public",
      host: "https://us.i.posthog.com",
      privacySignals: { globalPrivacyControl: true },
    }), null);
  });

  it("reuses the shared anonymous ID for 30 days, then rotates it", () => {
    const storage = memoryStorage();
    const ids = ["anon_1111111111111111", "anon_2222222222222222"];
    const createId = () => ids.shift() ?? "anon_3333333333333333";
    const first = getRotatingAnonymousId(storage, 1_000, createId);
    const same = getRotatingAnonymousId(storage, 1_000 + 29 * 86_400_000, createId);
    const rotated = getRotatingAnonymousId(storage, 1_000 + 30 * 86_400_000, createId);

    assert.equal(first, "anon_1111111111111111");
    assert.equal(same, first);
    assert.equal(rotated, "anon_2222222222222222");
  });

  it("keeps the shared policy contract aligned with the hardened runtime surface", async () => {
    const contract = JSON.parse(await readFile(new URL("../analytics-contract.json", import.meta.url), "utf8"));
    assert.deepEqual(contract.events, ANALYTICS_EVENTS);
    assert.deepEqual(Object.keys(contract.properties), ANALYTICS_PROPERTIES);
    assert.deepEqual(contract.properties, {
      experiment_id: { type: "token", maxLength: 64, pattern: "^[A-Za-z0-9._-]+$" },
      puzzle_id: { type: "token", maxLength: 64, pattern: "^[A-Za-z0-9._-]+$" },
      source: { type: "token", maxLength: 64, pattern: "^[A-Za-z0-9._-]+$" },
      campaign: { type: "token", maxLength: 64, pattern: "^[A-Za-z0-9._-]+$" },
      referrer_class: { type: "enum", values: ["direct", "internal", "search", "social", "referral"] },
      returning_player: { type: "boolean" },
      outcome: { type: "enum", values: ["delivered", "dropped"] },
      latency_ms: { type: "number", minimum: 0, maximum: 10_000 },
      reliability_pct: { type: "number", minimum: 0, maximum: 100 },
      hops: { type: "integer", minimum: 0, maximum: 6 },
      grade: { type: "enum", values: ["S", "A", "B", "C", "D"] },
    });
    assert.deepEqual(Object.values(contract.privacy), [false, false, false, false, false, false]);
  });
});

function memoryStorage(): Pick<Storage, "getItem" | "setItem"> {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
}
