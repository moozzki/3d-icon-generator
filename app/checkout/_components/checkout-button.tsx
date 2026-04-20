"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ExternalLink, AlertCircle, RefreshCw } from "lucide-react";
import { IDR_PACKAGES, IdrPackageId } from "@/lib/pakasir/packages";

interface CheckoutButtonProps {
  packageId: IdrPackageId;
}

type State =
  | { status: "loading" }
  | { status: "redirecting"; checkoutUrl: string }
  | { status: "error"; message: string };

export function CheckoutButton({ packageId }: CheckoutButtonProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  const hasFetched = useRef(false);

  const pkg = IDR_PACKAGES[packageId];
  const displayAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(pkg.amount);

  const initiatePayment = async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/payment/pakasir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });

      const data = await res.json();

      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error ?? "Failed to create payment session.");
      }

      setState({ status: "redirecting", checkoutUrl: data.checkoutUrl });

      // Auto-redirect after a short delay to let the user see the transition
      setTimeout(() => {
        window.location.href = data.checkoutUrl;
      }, 800);
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  };

  // Auto-trigger on mount (seamless UX — user lands and is forwarded immediately)
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    initiatePayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Preparing your payment session…</span>
        </div>
      </div>
    );
  }

  if (state.status === "redirecting") {
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        <div className="flex items-center gap-2 text-sm text-emerald-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Redirecting to payment page…</span>
        </div>
        <a
          href={state.checkoutUrl}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Click here if you are not redirected
        </a>
      </div>
    );
  }

  // Error state — show message + retry + manual CTA
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive w-full">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{state.message}</span>
      </div>

      <button
        onClick={initiatePayment}
        className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-[0.98]"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>

      <p className="text-xs text-muted-foreground/60 text-center">
        You will be charged{" "}
        <span className="font-medium text-muted-foreground">{displayAmount}</span> for{" "}
        <span className="font-medium text-muted-foreground">{pkg.credits} credits</span>.
      </p>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
        <ExternalLink className="w-3 h-3" />
        <span>Powered by Pakasir — QRIS &amp; Virtual Account</span>
      </div>
    </div>
  );
}
