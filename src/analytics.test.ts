import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { sanitizeProperties, setAnalyticsSink, track } from "./analytics";

let restore: (() => void) | undefined;

afterEach(() => {
  restore?.();
  restore = undefined;
});

describe("anonymous analytics", () => {
  it("keeps only explicitly allowed, bounded primitive values", () => {
    assert.deepEqual(
      sanitizeProperties({
        experiment_id: "cramzz-exp-example",
        returning_player: true,
        score: 42,
        email: "someone@example.com",
        source: "x".repeat(81),
      }),
      {
      experiment_id: "cramzz-exp-example",
      returning_player: true,
      score: 42,
      },
    );
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
});
