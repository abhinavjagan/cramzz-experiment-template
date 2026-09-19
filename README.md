# Cramzz experiment template

A deliberately small Vite + TypeScript starting point for experiments published beneath `cramzz.space/e/<slug>/`. It includes the manifest contract, privacy-safe analytics boundary, unit tests, browser smoke tests, and pull-request checks.

## Start a repository

1. Create a private repository named `cramzz-exp-<slug>` from this template.
2. Replace every `example-experiment` value in `experiment.json`, `.env.example`, and the CI base path.
3. Write one falsifiable sentence in `EXPERIMENT.md` before implementation.
4. Run `npm install`, `npm run verify`, and `npm run e2e`.
5. Keep the checked-in `pinnedCommit` as `UNPINNED`; a commit cannot contain its own final SHA. At launch, mark the status `testing` and set the launch date.
6. Let the shared static-artifact workflow stamp the exact source SHA into the release copy of `dist/experiment.json`. Publish that tested artifact into the hub; never rebuild an unpinned branch for production.

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

`src/analytics.ts` accepts only named events and an allowlist of bounded, non-identifying properties. It has no network destination by default. The Cramzz hub may listen for `cramzz:analytics` browser events and forward them to its configured provider. Do not add email, names, full URLs, free-form text, device fingerprints, payment data, or sponsor submissions.

## Definition of done

- The interaction is understandable without an account and completes in under one minute.
- Keyboard, screen reader, reduced-motion, narrow-screen, and offline/error paths work.
- Sharing is voluntary and never implies that a player endorses a sponsor.
- Sponsor placements are visibly labelled and cannot change outcomes.
- `EXPERIMENT.md`, `PRIVACY.md`, `METRICS.md`, `DECISION.md`, and `docs/screenshots/` are current.
- CI is green and `experiment.json` points at the exact release commit.
