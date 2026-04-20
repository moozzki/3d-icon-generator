/**
 * Server-side only — never import on the client.
 * Canonical map of IDR package IDs to their Pakasir amount and credit grant.
 *
 * studio_idr note: PRD originally listed 15000 (typo). Correct amount is Rp 150.000.
 */
export const IDR_PACKAGES = {
  starter_idr: { amount: 30000,  credits: 10 },
  creator_idr: { amount: 75000,  credits: 30 },
  studio_idr:  { amount: 150000, credits: 75 },
} as const;

export type IdrPackageId = keyof typeof IDR_PACKAGES;

/** Human-readable display name derived from a package ID. */
export function packageDisplayName(packageId: IdrPackageId): string {
  return packageId
    .replace(/_idr$/, "")
    .replace(/^[a-z]/, (c) => c.toUpperCase()); // "creator_idr" → "Creator"
}
