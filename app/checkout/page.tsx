import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ShoppingBag, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { InHouseCheckout, PolarCheckout, type UsdPackageId } from "./_components/checkout-button";
import { IDR_PACKAGES, type IdrPackageId } from "@/lib/pakasir/packages";

// ─── Package Allowlist ──────────────────────────────────────────────────────
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

  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    const destination = rawPackageId
      ? `/checkout?package=${encodeURIComponent(rawPackageId)}`
      : "/checkout";
    redirect(`/sign-in?callbackURL=${encodeURIComponent(destination)}`);
  }

  if (!rawPackageId || !ALL_VALID_PACKAGES.has(rawPackageId)) {
    redirect(PRICING_PAGE);
  }

  const packageId = rawPackageId as ValidPackage;

  const country = requestHeaders.get("x-vercel-ip-country") ?? "ID";
  const isIndonesia = country === "ID";
  const isIdrPackage = packageId.endsWith("_idr");
  const isUsdPackage = packageId.endsWith("_usd");

  if (isIndonesia && isUsdPackage) {
    redirect(`/checkout?package=${swapCurrency(packageId)}`);
  }
  if (!isIndonesia && isIdrPackage) {
    redirect(`/checkout?package=${swapCurrency(packageId)}`);
  }

  // Determine order details
  let amount = 0;
  let credits = 0;
  let displayTotal = "";

  if (isIdrPackage) {
    const pkg = IDR_PACKAGES[packageId as keyof typeof IDR_PACKAGES];
    amount = pkg?.amount || 0;
    credits = pkg?.credits || 0;
    displayTotal = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  } else {
    if (packageId.includes("starter")) { amount = 5.00; credits = 25; }
    else if (packageId.includes("creator")) { amount = 10.00; credits = 60; }
    else if (packageId.includes("studio")) { amount = 25.00; credits = 175; }
    displayTotal = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  const packageName = packageId.replace(/_(idr|usd)$/, "").replace(/^[a-z]/, (c) => c.toUpperCase());

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-background">
      <div className="fixed inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.06] pointer-events-none" />

      <div className="relative w-full max-w-5xl rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/5 overflow-hidden flex flex-col lg:flex-row">

        {/* Left Column: Order Information */}
        <div className="w-full lg:w-[40%] bg-muted/20 p-6 lg:p-8 flex flex-col border-b lg:border-b-0 lg:border-r border-border/60">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading leading-tight">Checkout</h1>
              <p className="text-xs text-muted-foreground">Secure payment</p>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Order Summary</h2>

            <div className="rounded-xl border border-border/50 bg-background p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{packageName} Package</p>
                  <p className="text-sm text-muted-foreground">{credits} Credits</p>
                </div>
                <div className="text-lg font-bold text-primary">{displayTotal}</div>
              </div>

              <div className="border-t border-border/50 pt-4 space-y-2">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p>Instant activation upon successful payment.</p>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p>Credits never expire.</p>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p>Secure transaction powered by {isIdrPackage ? "Pakasir" : "Polar"}.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Image
                src="/assets/audora-square-logo.png"
                alt="Audora"
                width={20}
                height={20}
                className="w-5 h-5 object-contain opacity-70 filter grayscale"
              />
              <span className="text-sm font-medium text-muted-foreground">Audora</span>
            </div>
            <p className="text-xs text-muted-foreground/60 max-w-[250px]">
              By proceeding, you agree to our Terms of Service and Privacy Policy. All transactions are securely processed.
            </p>
          </div>
        </div>

        {/* Right Column: Payment Methods & Action */}
        <div className="w-full lg:w-[60%] p-6 lg:p-8 bg-card flex flex-col justify-center">
          {isIdrPackage ? (
            <InHouseCheckout
              packageId={packageId as IdrPackageId}
              userEmail={session!.user.email}
            />
          ) : (
            <PolarCheckout
              packageId={packageId as UsdPackageId}
              userEmail={session!.user.email}
            />
          )}
        </div>

      </div>
    </div>
  );
}
