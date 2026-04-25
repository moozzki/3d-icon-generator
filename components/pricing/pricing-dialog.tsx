"use client";

import { Check, Zap, Star } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Package {
  emoji: string;
  name: string;
  description: string;
  credits: number;
  price: string;
  originalPrice?: string;
  perCredit: string;
  packageId: string;
  ctaText: string;
  featured: boolean;
  bestValue?: boolean;
  savings?: string;
}

const packagesIDR: Package[] = [
  {
    emoji: "🥉",
    name: "Starter",
    description: "Perfect for hobbyists",
    credits: 10,
    price: "Rp 30.000",
    perCredit: "Rp 3.000 / credit",
    packageId: "starter_idr",
    ctaText: "Buy Starter",
    featured: false,
  },
  {
    emoji: "🥈",
    name: "Creator",
    description: "Most popular for pros",
    credits: 30,
    price: "Rp 75.000",
    originalPrice: "Rp 90.000",
    perCredit: "Rp 2.500 / credit",
    packageId: "creator_idr",
    ctaText: "Buy Creator",
    featured: true,
    savings: "Save 17%",
  },
  {
    emoji: "🥇",
    name: "Studio",
    description: "For teams & studios",
    credits: 75,
    price: "Rp 150.000",
    originalPrice: "Rp 225.000",
    perCredit: "Rp 2.000 / credit",
    packageId: "studio_idr",
    ctaText: "Buy Studio",
    featured: false,
    bestValue: true,
    savings: "Save 33%",
  },
];

const packagesUSD: Package[] = [
  {
    emoji: "🥉",
    name: "Starter",
    description: "Perfect for hobbyists",
    credits: 25,
    price: "$5.00",
    perCredit: "$0.20 / credit",
    packageId: "starter_usd",
    ctaText: "Buy Starter",
    featured: false,
  },
  {
    emoji: "🥈",
    name: "Creator",
    description: "Most popular for pros",
    credits: 60,
    price: "$10.00",
    originalPrice: "$12.00",
    perCredit: "$0.16 / credit",
    packageId: "creator_usd",
    ctaText: "Buy Creator",
    featured: true,
    savings: "Save 17%",
  },
  {
    emoji: "🥇",
    name: "Studio",
    description: "For teams & studios",
    credits: 175,
    price: "$25.00",
    originalPrice: "$35.00",
    perCredit: "$0.14 / credit",
    packageId: "studio_usd",
    ctaText: "Buy Studio",
    featured: false,
    bestValue: true,
    savings: "Save 29%",
  },
];

const features = [
  "Text-to-3D Icon",
  "Image-to-3D Icon",
  "Refine 3D Icon",
  "2K & 4K Export",
  "Commercial License",
];

export function PricingDialog({
  open,
  onOpenChange,
  country = "ID",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country?: string;
}) {
  const isIDR = country === "ID";
  const packages = isIDR ? packagesIDR : packagesUSD;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] !max-w-[960px] p-0 overflow-y-auto max-h-[90vh] bg-background border-border/50 shadow-2xl">
        <div className="p-5 sm:p-6 lg:p-8">

          {/* Header */}
          <DialogHeader className="text-center mb-6">
            <div className="inline-flex items-center justify-center gap-1 mx-auto py-0.5 px-2.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase mb-2">
              <Zap className="w-3 h-3 fill-current" />
              Credit-Based Pricing
            </div>
            <DialogTitle className="font-heading font-bold text-xl sm:text-2xl tracking-tight">
              Top Up Credits
            </DialogTitle>
            <p className="text-muted-foreground text-xs mt-1">
              Credits never expire. One purchase, unlimited possibilities.
            </p>
          </DialogHeader>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
            {packages.map((pkg) =>
              pkg.featured ? (
                /* Creator — Featured */
                <div
                  key={pkg.packageId}
                  className="relative flex flex-col rounded-xl border-2 border-primary bg-primary/5 p-4 lg:p-5"
                >
                  {/* Popular badge */}
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 whitespace-nowrap">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    Most Popular
                  </div>

                  {/* Card top */}
                  <div className="flex items-start justify-between mb-3 mt-1">
                    <div>
                      <span className="text-lg leading-none">{pkg.emoji}</span>
                      <h3 className="font-heading font-bold text-sm mt-1">{pkg.name}</h3>
                      <p className="text-muted-foreground text-[11px] leading-tight mt-0.5">{pkg.description}</p>
                    </div>
                    {pkg.savings && (
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                        {pkg.savings}
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tracking-tight">{pkg.credits}</span>
                      <span className="text-muted-foreground text-xs font-medium">Credits</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-base font-bold">{pkg.price}</span>
                      {pkg.originalPrice && (
                        <span className="text-xs text-muted-foreground/60 line-through">{pkg.originalPrice}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-primary font-medium mt-0.5">{pkg.perCredit}</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5 mb-4 flex-1">
                    {features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-1.5 text-[11px]">
                        <Check className="w-3 h-3 text-primary shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href={`/checkout?package=${pkg.packageId}`}
                    onClick={() => onOpenChange(false)}
                    className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold text-center block transition-all hover:opacity-90 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {pkg.ctaText}
                  </Link>
                </div>
              ) : (
                /* Starter & Studio */
                <div
                  key={pkg.packageId}
                  className="relative flex flex-col rounded-xl border border-border/60 bg-card hover:border-border hover:bg-muted/30 transition-colors p-4 lg:p-5"
                >
                  {/* Card top */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-lg leading-none">{pkg.emoji}</span>
                      <h3 className="font-heading font-bold text-sm mt-1">{pkg.name}</h3>
                      <p className="text-muted-foreground text-[11px] leading-tight mt-0.5">{pkg.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {pkg.bestValue && (
                        <span className="text-[10px] font-black text-violet-600 dark:text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                          💎 Best Value
                        </span>
                      )}
                      {pkg.savings && (
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                          {pkg.savings}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tracking-tight">{pkg.credits}</span>
                      <span className="text-muted-foreground text-xs font-medium">Credits</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-base font-bold">{pkg.price}</span>
                      {pkg.originalPrice && (
                        <span className="text-xs text-muted-foreground/60 line-through">{pkg.originalPrice}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{pkg.perCredit}</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5 mb-4 flex-1">
                    {features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Check className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href={`/checkout?package=${pkg.packageId}`}
                    onClick={() => onOpenChange(false)}
                    className="w-full py-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-bold text-center block transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {pkg.ctaText}
                  </Link>
                </div>
              )
            )}
          </div>

          {/* Footer note */}
          <p className="text-center text-[10px] text-muted-foreground/60 mt-4">
            🔒 Secure checkout · Credits never expire · Full commercial license
          </p>

        </div>
      </DialogContent>
    </Dialog>
  );
}
