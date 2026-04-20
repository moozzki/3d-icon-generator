import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ShoppingBag, Loader2 } from "lucide-react";
import Image from "next/image";
import { CheckoutButton } from "./_components/checkout-button";
import type { IdrPackageId } from "@/lib/pakasir/packages";

// ─── Package Allowlist ──────────────────────────────────────────────────────
// Canonical list of valid package IDs. Add new tiers here as they are created.
const VALID_PACKAGES_IDR = ["starter_idr", "creator_idr", "studio_idr"] as const;
const VALID_PACKAGES_USD = ["starter_usd", "creator_usd", "studio_usd"] as const;
type PackageIdr = (typeof VALID_PACKAGES_IDR)[number];
type PackageUsd = (typeof VALID_PACKAGES_USD)[number];
type ValidPackage = PackageIdr | PackageUsd;

const ALL_VALID_PACKAGES = new Set<string>([
  ...VALID_PACKAGES_IDR,
  ...VALID_PACKAGES_USD,
]);

const PRICING_PAGE = "https://useaudora.com/pricing";

/** Swaps the currency suffix of a valid package ID (e.g. creator_usd → creator_idr). */
function swapCurrency(packageId: ValidPackage): ValidPackage {
  if (packageId.endsWith("_idr")) {
    return packageId.replace(/_idr$/, "_usd") as ValidPackage;
  }
  return packageId.replace(/_usd$/, "_idr") as ValidPackage;
}

// ─── Page ───────────────────────────────────────────────────────────────────

interface CheckoutPageProps {
  searchParams: Promise<{ package?: string }>;
}

export const metadata = {
  title: "Checkout — Audora",
  description: "Complete your Audora credit purchase.",
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { package: rawPackageId } = await searchParams;
  const requestHeaders = await headers();

  // ── 1. Auth guard ─────────────────────────────────────────────────────────
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    const destination = rawPackageId
      ? `/checkout?package=${encodeURIComponent(rawPackageId)}`
      : "/checkout";
    redirect(`/sign-in?callbackURL=${encodeURIComponent(destination)}`);
  }

  // ── 2. Package validation ─────────────────────────────────────────────────

  // 2a. Unknown / missing package → send to pricing page
  if (!rawPackageId || !ALL_VALID_PACKAGES.has(rawPackageId)) {
    redirect(PRICING_PAGE);
  }

  const packageId = rawPackageId as ValidPackage;

  // 2b. Geo-currency validation
  // x-vercel-ip-country is set by Vercel's edge network.
  // Falls back to 'ID' for local development so IDR is the default.
  const country = requestHeaders.get("x-vercel-ip-country") ?? "ID";
  const isIndonesia = country === "ID";
  const isIdrPackage = packageId.endsWith("_idr");
  const isUsdPackage = packageId.endsWith("_usd");

  if (isIndonesia && isUsdPackage) {
    // Indonesian user tried to access a USD package — redirect to IDR equivalent
    redirect(`/checkout?package=${swapCurrency(packageId)}`);
  }

  if (!isIndonesia && isIdrPackage) {
    // International user tried to access an IDR package — redirect to USD equivalent
    redirect(`/checkout?package=${swapCurrency(packageId)}`);
  }

  // ── 3. Render confirmation UI ─────────────────────────────────────────────
  const displayName = packageId
    .replace(/_idr$/, "")
    .replace(/_usd$/, "")
    .replace(/^\w/, (c) => c.toUpperCase()); // e.g. "creator_idr" → "Creator"

  const currency = isIdrPackage ? "IDR" : "USD";

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-background">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.06] pointer-events-none" />

      <div className="relative w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/5 p-8 flex flex-col items-center gap-6 text-center">
        {/* Logo */}
        <Image
          src="/assets/audora-square-logo.png"
          alt="Audora"
          width={44}
          height={44}
          className="w-11 h-11 object-contain"
          priority
        />

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <ShoppingBag className="w-7 h-7 text-primary" />
        </div>

        {/* Heading */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold font-heading">Confirm Your Purchase</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You&apos;re about to purchase the{" "}
            <span className="font-semibold text-foreground">{displayName}</span>{" "}
            package ({currency}). Redirecting you to the payment page&hellip;
          </p>
        </div>

        {/* Loading indicator — payment gateway integration in next task */}
        {isIdrPackage ? (
          <CheckoutButton packageId={packageId as IdrPackageId} />
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Preparing your checkout&hellip;</span>
          </div>
        )}

        {/* User context */}
        <p className="text-xs text-muted-foreground/50">
          Signed in as{" "}
          <span className="font-medium text-muted-foreground">{session.user.email}</span>
        </p>
      </div>
    </div>
  );
}
