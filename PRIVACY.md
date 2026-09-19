# Privacy notes

This experiment requires no account. Store only gameplay state needed for the visitor's experience, preferably in local browser storage. Document every key and retention rule here.

Analytics is limited to the event names and bounded properties in `analytics-contract.json`. When production PostHog variables are configured, the browser stores `cramzz.analytics.anonymous-id.v1`, a random site-scoped identifier that rotates after 30 days. DNT and Global Privacy Control disable transmission; each request disables person-profile processing and GeoIP enrichment. No analytics SDK, autocapture, or session replay is loaded. Do not collect names, email addresses, precise locations, full referrer URLs, advertising identifiers, device fingerprints, sponsor submissions, or payment data.

Sponsor forms and payments must open the approved external services. A callback or return URL is not proof that payment was captured.

## Local storage inventory

| Key | Purpose | Data | Expiry |
| --- | --- | --- | --- |
| `cramzz.analytics.anonymous-id.v1` | Anonymous aggregate measurement when configured | Random ID and creation timestamp | Rotates after 30 days |
