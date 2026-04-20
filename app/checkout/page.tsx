import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ShoppingBag, Loader2 } from "lucide-react";
import Image from "next/image";

interface CheckoutPageProps {
  searchParams: Promise<{ package?: string }>;
}

export const metadata = {
  title: "Checkout — Audora",
  description: "Complete your Audora credit purchase.",
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { package: packageId } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    const destination = packageId
      ? `/checkout?package=${encodeURIComponent(packageId)}`
      : "/checkout";
    redirect(`/sign-in?callbackURL=${encodeURIComponent(destination)}`);
  }

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
            <span className="font-semibold text-foreground capitalize">
              {packageId ? packageId.replace(/_/g, " ") : "selected"}
            </span>{" "}
            package. Redirecting you to the payment page&hellip;
          </p>
        </div>

        {/* Loading indicator — payment gateway integration in next task */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Preparing your checkout&hellip;</span>
        </div>

        {/* User context */}
        <p className="text-xs text-muted-foreground/50">
          Signed in as{" "}
          <span className="font-medium text-muted-foreground">{session.user.email}</span>
        </p>
      </div>
    </div>
  );
}
