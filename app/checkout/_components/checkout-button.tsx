"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  CheckCircle,
  Copy,
  Check,
  X,
  Clock,
  CreditCard,
  QrCode,
  ArrowLeft,
} from "lucide-react";
import { IDR_PACKAGES, IdrPackageId } from "@/lib/pakasir/packages";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaymentMethod {
  id: string;
  label: string;
  type: "qris" | "va";
  icon: React.ReactNode;
}

interface PaymentResponse {
  transactionId: number;
  expiresAt: string;
  paymentMethod: string;
  paymentNumber: string;
  totalPayment: number;
  fee: number;
}

type Step =
  | { kind: "select" }
  | { kind: "paying"; data: PaymentResponse }
  | { kind: "success" }
  | { kind: "expired" }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

// ─── Payment Method Config ────────────────────────────────────────────────────

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "qris",
    label: "QRIS",
    type: "qris",
    icon: <QrCode className="w-5 h-5" />,
  },
  {
    id: "bni_va",
    label: "BNI Virtual Account",
    type: "va",
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    id: "bri_va",
    label: "BRI Virtual Account",
    type: "va",
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    id: "permata_va",
    label: "Permata Virtual Account",
    type: "va",
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    id: "cimb_niaga_va",
    label: "CIMB Niaga Virtual Account",
    type: "va",
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    id: "maybank_va",
    label: "Maybank Virtual Account",
    type: "va",
    icon: <CreditCard className="w-5 h-5" />,
  },
];

// ─── Countdown hook ──────────────────────────────────────────────────────────

function useCountdown(expiresAt: string | null) {
  const getRemaining = () =>
    expiresAt ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)) : 0;

  const [seconds, setSeconds] = useState(getRemaining);

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => {
      const rem = getRemaining();
      setSeconds(rem);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return { seconds, formatted: `${mm}:${ss}` };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface InHouseCheckoutProps {
  packageId: IdrPackageId;
  userEmail: string;
}

export function InHouseCheckout({ packageId, userEmail }: InHouseCheckoutProps) {
  const router = useRouter();
  const pkg = IDR_PACKAGES[packageId];

  const [step, setStep] = useState<Step>({ kind: "select" });
  const [selectedMethod, setSelectedMethod] = useState<string>("qris");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const displayAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(pkg.amount);

  // ── Countdown ──────────────────────────────────────────────────────────────
  const expiresAt = step.kind === "paying" ? step.data.expiresAt : null;
  const { seconds, formatted: countdownFormatted } = useCountdown(expiresAt);

  // Auto-expire when countdown hits 0
  useEffect(() => {
    if (step.kind !== "paying" || seconds > 0) return;
    setStep({ kind: "expired" });
    // Best-effort cancel on server
    fetch("/api/payment/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: step.data.transactionId }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  // ── Payment status polling ───────────────────────────────────────────────
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Only poll while in the "paying" state
    if (step.kind !== "paying") {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const transactionId = step.data.transactionId;

    const checkStatus = async () => {
      try {
        const res = await fetch(
          `/api/payment/status?transactionId=${transactionId}`
        );
        if (!res.ok) return; // transient error — keep polling
        const data = await res.json();
        if (data.status === "paid") {
          setStep({ kind: "success" });
        }
      } catch {
        // Network error — keep polling silently
      }
    };

    // Immediate first check, then every 3 seconds
    checkStatus();
    pollingRef.current = setInterval(checkStatus, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind]);

  // ── Confirm & Pay ──────────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/payment/pakasir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, paymentMethod: selectedMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create payment.");
      setStep({ kind: "paying", data: data as PaymentResponse });
    } catch (err) {
      setStep({
        kind: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setSubmitting(false);
    }
  }, [packageId, selectedMethod]);

  // ── Cancel ─────────────────────────────────────────────────────────────────
  const handleCancel = useCallback(async () => {
    if (step.kind !== "paying") return;
    setCancelling(true);
    try {
      await fetch("/api/payment/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: step.data.transactionId }),
      });
    } catch {
      // Ignore — we still navigate away
    }
    setStep({ kind: "cancelled" });
    router.push("/");
  }, [step, router]);

  // ── Change Method ────────────────────────────────────────────────────────
  const handleChangeMethod = useCallback(() => {
    if (step.kind !== "paying") return;
    // Best-effort cancel the current transaction, so we don't have dangling open ones
    fetch("/api/payment/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: step.data.transactionId }),
    }).catch(() => {});
    
    setStep({ kind: "select" });
  }, [step]);

  // ─── Render: Method Selection ──────────────────────────────────────────────
  if (step.kind === "select" || step.kind === "error") {
    return (
      <div className="flex flex-col gap-6 w-full">
        {/* Header (replaces redundant summary) */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">Payment Details</h2>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{userEmail}</span>
          </p>
        </div>

        {/* Error banner */}
        {step.kind === "error" && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{step.message}</span>
          </div>
        )}

        {/* Payment method selector */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMethod(m.id)}
                className={`group flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium text-left transition-all
                  ${selectedMethod === m.id
                    ? "border-primary bg-primary/5 text-foreground shadow-sm ring-1 ring-primary/20"
                    : "border-border/50 bg-background text-muted-foreground hover:border-border hover:bg-muted/50"
                  }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    selectedMethod === m.id
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/10 group-hover:text-foreground"
                  }`}
                >
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{m.label}</span>
                </div>
                {selectedMethod === m.id && (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating payment…
            </>
          ) : (
            <>
              Pay {displayAmount}
            </>
          )}
        </button>
      </div>
    );
  }

  // ─── Render: Waiting for Payment ──────────────────────────────────────────
  if (step.kind === "paying") {
    const { data } = step;
    const isQris = data.paymentMethod === "qris";

    const urgentCountdown = seconds < 300; // less than 5 min

    return (
      <div className="flex flex-col gap-5 w-full">
        {/* Countdown */}
        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${urgentCountdown ? "border-orange-500/30 bg-orange-500/5" : "border-border/50 bg-muted/30"}`}>
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${urgentCountdown ? "text-orange-500" : "text-muted-foreground"}`} />
            <span className="text-xs text-muted-foreground">Payment expires in</span>
          </div>
          <span className={`text-lg font-mono font-bold tabular-nums ${urgentCountdown ? "text-orange-500" : "text-foreground"}`}>
            {countdownFormatted}
          </span>
        </div>

        {/* Payment data */}
        {isQris ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-muted-foreground">Scan QR code with your e-wallet or banking app</p>
            <div className="rounded-2xl border border-border/50 bg-white p-4 shadow-sm">
              <QRCode
                value={data.paymentNumber}
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              />
            </div>
            <p className="text-xs text-muted-foreground/60">Supported: GoPay, OVO, Dana, ShopeePay, and all QRIS-compatible apps</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">Transfer to Virtual Account number below</p>
            <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">VA Number</p>
                <p className="text-lg font-mono font-bold tracking-wider text-foreground">
                  {data.paymentNumber}
                </p>
              </div>
              <CopyButton text={data.paymentNumber} />
            </div>
          </div>
        )}

        {/* Total */}
        <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span>{displayAmount}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Biaya Admin (Fee)</span>
            <div className="flex items-center gap-1.5">
              <span className="line-through opacity-60">
                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(data.fee)}
              </span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-600 dark:text-emerald-500">
                Free
              </span>
            </div>
          </div>
          <div className="border-t border-border/40 pt-2 flex items-center justify-between text-sm font-semibold text-foreground">
            <span>Total</span>
            <span>{displayAmount}</span>
          </div>
        </div>

        {/* Waiting indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Waiting for payment confirmation…</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 w-full mt-2">
          <button
            onClick={handleChangeMethod}
            disabled={cancelling}
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-border/50 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            <ArrowLeft className="w-4 h-4" />
            Change Payment Method
          </button>
          
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60"
          >
            {cancelling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            Cancel Payment
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: Success ──────────────────────────────────────────────────────
  if (step.kind === "success") {
    // Auto-redirect to main route
    if (typeof window !== "undefined") {
      setTimeout(() => router.push("/"), 2000);
    }
    return (
      <div className="flex flex-col items-center gap-5 w-full text-center py-4">
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center animate-in zoom-in-50 duration-500">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
        </div>
        <div className="space-y-1.5">
          <p className="text-xl font-bold text-foreground">Payment Successful!</p>
          <p className="text-sm text-muted-foreground">
            Your credits have been added. Redirecting you now…
          </p>
        </div>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Render: Expired ──────────────────────────────────────────────────────
  if (step.kind === "expired") {
    return (
      <div className="flex flex-col items-center gap-4 w-full text-center">
        <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center">
          <Clock className="w-6 h-6 text-orange-500" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Payment Expired</p>
          <p className="text-sm text-muted-foreground">Your payment window has closed. No charge was made.</p>
        </div>
        <button
          onClick={() => setStep({ kind: "select" })}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
        >
          <ArrowLeft className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  // ─── Render: Cancelled ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-4 w-full text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <X className="w-6 h-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">Payment Cancelled</p>
        <p className="text-sm text-muted-foreground">Redirecting you to pricing…</p>
      </div>
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
    </div>
  );
}

// ─── Polar USD Checkout ───────────────────────────────────────────────────────

export type UsdPackageId = "starter_usd" | "creator_usd" | "studio_usd";

const USD_PACKAGE_DISPLAY: Record<UsdPackageId, { name: string; credits: number; amount: number }> = {
  starter_usd: { name: "Starter", credits: 25,  amount: 5.00  },
  creator_usd: { name: "Creator", credits: 60,  amount: 10.00 },
  studio_usd:  { name: "Studio",  credits: 175, amount: 25.00 },
};

interface PolarCheckoutProps {
  packageId: UsdPackageId;
  userEmail: string;
}

export function PolarCheckout({ packageId, userEmail }: PolarCheckoutProps) {
  const pkg = USD_PACKAGE_DISPLAY[packageId];
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const displayAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(pkg.amount);

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/payment/polar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to initiate checkout.");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Payment Details</h2>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{userEmail}</span>
        </p>
      </div>

      {/* Package summary card */}
      <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-foreground">{pkg.name} Package</p>
          <p className="text-sm text-muted-foreground">{pkg.credits} Credits</p>
        </div>
        <p className="text-xl font-bold text-primary">{displayAmount}</p>
      </div>

      {/* What's included */}
      <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 space-y-2">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p>Instant credit activation after payment.</p>
        </div>
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p>Credits never expire — use them anytime.</p>
        </div>
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p>Secured by Polar — taxes & receipts handled automatically.</p>
        </div>
      </div>

      {/* Accepted payment methods */}
      <p className="text-xs text-muted-foreground text-center">
        Accepted: Visa, Mastercard, Apple Pay, Google Pay
      </p>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handlePay}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparing checkout…
          </>
        ) : (
          <>Pay with Card / Apple Pay &rarr;</>
        )}
      </button>
    </div>
  );
}
