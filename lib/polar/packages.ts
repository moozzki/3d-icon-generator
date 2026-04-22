/**
 * Server-side only — never import on the client.
 * Canonical map of USD package IDs → Polar product ID + credit grant.
 *
 * Product IDs come from the Polar dashboard.
 * Prices are enforced at the Polar product level, not here.
 */
export const USD_PACKAGES = {
  starter_usd: { polarProductId: "50c025e4-bcb7-4d0f-95cf-ec5265aa1ce3", credits: 25,  amount: 5.00  },
  creator_usd: { polarProductId: "51cc7934-3378-43ee-a69b-fc7c3401b585", credits: 60,  amount: 10.00 },
  studio_usd:  { polarProductId: "a792145f-9f27-4f73-934d-9c31cbb954de", credits: 175, amount: 25.00 },
} as const;

export type UsdPackageId = keyof typeof USD_PACKAGES;

/** Human-readable display name derived from a USD package ID. */
export function usdPackageDisplayName(packageId: UsdPackageId): string {
  return packageId
    .replace(/_usd$/, "")
    .replace(/^[a-z]/, (c) => c.toUpperCase()); // "creator_usd" → "Creator"
}
