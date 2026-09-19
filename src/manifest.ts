export type ExperimentStatus =
  | "backlog"
  | "building"
  | "testing"
  | "scaled"
  | "iterating"
  | "retired";

export interface SponsorInventoryItem {
  id: string;
  label: string;
  priceInr: number;
  quantity: number;
  status: "locked" | "available" | "sold-out" | "retired";
}

export interface ExperimentManifest {
  slug: string;
  title: string;
  repository: string;
  pinnedCommit: string;
  status: ExperimentStatus;
  launchDate: string | null;
  hypothesis: string;
  sponsorInventory: SponsorInventoryItem[];
  analyticsIdentifier: string;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set<ExperimentStatus>([
  "backlog",
  "building",
  "testing",
  "scaled",
  "iterating",
  "retired",
]);
const SPONSOR_STATUSES = new Set<SponsorInventoryItem["status"]>([
  "locked",
  "available",
  "sold-out",
  "retired",
]);
const ALLOWED_KEYS = new Set([
  "$schema",
  "slug",
  "title",
  "repository",
  "pinnedCommit",
  "status",
  "launchDate",
  "hypothesis",
  "sponsorInventory",
  "analyticsIdentifier",
]);
const SPONSOR_KEYS = new Set(["id", "label", "priceInr", "quantity", "status"]);

function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function parseManifest(value: unknown): ExperimentManifest {
  if (!value || typeof value !== "object") throw new Error("Manifest must be an object");
  const candidate = value as Record<string, unknown>;

  const unknownKey = Object.keys(candidate).find((key) => !ALLOWED_KEYS.has(key));
  if (unknownKey) throw new Error(`Manifest property ${unknownKey} is not allowed`);

  if (typeof candidate.slug !== "string" || !SLUG.test(candidate.slug)) {
    throw new Error("Manifest slug must be kebab-case");
  }
  if (
    typeof candidate.title !== "string" ||
    candidate.title.trim() === "" ||
    candidate.title.length > 80
  ) {
    throw new Error("Manifest title is required");
  }
  if (
    typeof candidate.repository !== "string" ||
    !candidate.repository.startsWith("https://github.com/abhinavjagan/")
  ) {
    throw new Error("Manifest repository must use the abhinavjagan GitHub account");
  }
  if (
    typeof candidate.pinnedCommit !== "string" ||
    !/^(UNPINNED|[0-9a-f]{40})$/.test(candidate.pinnedCommit)
  ) {
    throw new Error("Manifest pinnedCommit must be UNPINNED or a full Git SHA");
  }
  if (typeof candidate.status !== "string" || !STATUSES.has(candidate.status as ExperimentStatus)) {
    throw new Error("Manifest status is invalid");
  }
  if (
    candidate.launchDate !== null &&
    (typeof candidate.launchDate !== "string" || !isIsoDate(candidate.launchDate))
  ) {
    throw new Error("Manifest launchDate must be an ISO date or null");
  }
  if (["backlog", "building"].includes(candidate.status as string) && candidate.launchDate !== null) {
    throw new Error("Backlog and building manifests must keep launchDate null");
  }
  if (!["backlog", "building"].includes(candidate.status as string) && candidate.launchDate === null) {
    throw new Error("Testing and later manifests require a launchDate");
  }
  if (
    typeof candidate.hypothesis !== "string" ||
    candidate.hypothesis.length < 20 ||
    candidate.hypothesis.length > 500
  ) {
    throw new Error("Manifest hypothesis must be specific");
  }
  if (!Array.isArray(candidate.sponsorInventory)) {
    throw new Error("Manifest sponsorInventory must be an array");
  }
  for (const item of candidate.sponsorInventory) {
    if (!item || typeof item !== "object") {
      throw new Error("Sponsor inventory entries must be objects");
    }
    const sponsor = item as Record<string, unknown>;
    const unknownSponsorKey = Object.keys(sponsor).find((key) => !SPONSOR_KEYS.has(key));
    if (unknownSponsorKey) {
      throw new Error(`Sponsor inventory property ${unknownSponsorKey} is not allowed`);
    }
    if (typeof sponsor.id !== "string" || !SLUG.test(sponsor.id)) {
      throw new Error("Sponsor inventory id must be kebab-case");
    }
    if (typeof sponsor.label !== "string" || sponsor.label.trim() === "") {
      throw new Error("Sponsor inventory label is required");
    }
    if (!Number.isInteger(sponsor.priceInr) || (sponsor.priceInr as number) < 0) {
      throw new Error("Sponsor inventory priceInr must be a non-negative integer");
    }
    if (!Number.isInteger(sponsor.quantity) || (sponsor.quantity as number) < 0) {
      throw new Error("Sponsor inventory quantity must be a non-negative integer");
    }
    if (
      typeof sponsor.status !== "string" ||
      !SPONSOR_STATUSES.has(sponsor.status as SponsorInventoryItem["status"])
    ) {
      throw new Error("Sponsor inventory status is invalid");
    }
  }
  if (typeof candidate.analyticsIdentifier !== "string" || !SLUG.test(candidate.analyticsIdentifier)) {
    throw new Error("Manifest analyticsIdentifier must be kebab-case");
  }

  return candidate as unknown as ExperimentManifest;
}
