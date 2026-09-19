# Cramzz experiment template

A deliberately small Vite + TypeScript starting point for experiments published beneath `cramzz.space/e/<slug>/`. It includes the manifest contract, privacy-safe analytics boundary, unit tests, browser smoke tests, and pull-request checks.

## Start a repository

1. Create a private repository named `cramzz-exp-<slug>` from this template.
2. Replace every `example-experiment` value in `experiment.json`, `.env.example`, and the CI base path.
3. Write one falsifiable sentence in `EXPERIMENT.md` before implementation.
4. Run `npm install`, `npm run verify`, and `npm run e2e`.
5. Keep the checked-in `pinnedCommit` as `UNPINNED`; a commit cannot contain its own final SHA. At launch, mark the status `testing` and set the launch date.
6. Pass the exact source SHA as `EXPERIMENT_SOURCE_COMMIT` in release CI. The build emits and verifies `dist/experiment.json` with that pin. The hub may ingest that tested artifact or reproducibly rebuild the same reviewed 40-character commit under the shared provenance checks; it must never build a mutable branch name for production.

## Commands

```text
npm run dev       local development
npm run typecheck strict TypeScript check
npm run test      unit tests
npm run build     production output in dist/
npm run e2e       Playwright smoke tests against dist/
npm run verify    unit tests plus production build
```

Set `CRAMZZ_BASE_PATH=/e/<slug>/` when building for the hub. `/` remains useful for local preview and isolated review deployments.

## Analytics boundary

`src/analytics.ts` accepts only named events and the per-field token, enum, boolean, and numeric bounds declared in `analytics-contract.json`. Unknown and sensitive keys are dropped. Production can send directly to an approved PostHog US/EU ingestion origin when both `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` are configured; otherwise it remains network-silent. The direct adapter uses a site-scoped anonymous ID that rotates after 30 days, respects DNT/GPC, disables person profiles and GeoIP, and loads no SDK, autocapture, or replay. The optional DOM event sink remains available for local integrations.

Never put a secret in a `VITE_` variable: Vite embeds it in the public bundle. Do not add email, names, full URLs, free-form text, device fingerprints, payment data, or sponsor submissions.

CI calls the reusable `analytics-contract.yml` job from `cramzz-workflows` using the same exact commit SHA in both the workflow `uses:` suffix and required `workflows_ref` input. When that contract changes, update both pins together; a workflow must never depend on an uncommitted or mutable reference.

## Definition of done

- The interaction is understandable without an account and completes in under one minute.
- Keyboard, screen reader, reduced-motion, narrow-screen, and offline/error paths work.
- Sharing is voluntary and never implies that a player endorses a sponsor.
- Sponsor placements are visibly labelled and cannot change outcomes.
- `EXPERIMENT.md`, `PRIVACY.md`, `METRICS.md`, `DECISION.md`, and `docs/screenshots/` are current.
- CI is green and `experiment.json` points at the exact release commit.
