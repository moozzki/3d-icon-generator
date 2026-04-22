"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Receipt,
  FileDown,
  ArrowUpRight,
  PackageOpen,
  AlertCircle,
} from "lucide-react";
import { cn, formatInvoiceId, formatPaymentMethod } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────

type PaymentStatus = "pending" | "paid" | "cancelled" | "expired";

interface Transaction {
  id: number;
  creditAmount: number;
  amount: string;
  currency: string;
  paymentProvider: string;
  paymentStatus: PaymentStatus;
  paymentProviderRef: string | null;
  createdAt: string;
}

// ── Status badge config ────────────────────────────────────────────────────

const statusConfig: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  paid: {
    label: "Paid",
    className:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15",
  },
  pending: {
    label: "Pending",
    className:
      "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/15",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/15",
  },
  expired: {
    label: "Expired",
    className:
      "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/15",
  },
};

function StatusBadge({ status }: { status: PaymentStatus }) {
  const cfg = statusConfig[status] ?? statusConfig.pending;
  return (
    <Badge
      variant="outline"
      className={cn("text-[11px] font-semibold px-2 py-0.5", cfg.className)}
    >
      {cfg.label}
    </Badge>
  );
}

// ── Package name helper ────────────────────────────────────────────────────

function formatPackageName(credits: number, provider: string): string {
  const providerLabel =
    provider === "pakasir"
      ? "IDR"
      : provider === "polar"
        ? "USD"
        : provider.charAt(0).toUpperCase() + provider.slice(1);
  return `${credits} Credit${credits !== 1 ? "s" : ""} · ${providerLabel}`;
}

// ── Amount formatter ───────────────────────────────────────────────────────

function formatAmount(amount: string, currency: string): string {
  const num = parseFloat(amount);
  if (currency === "IDR") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format(num);
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    }>
      <TransactionsContent />
    </Suspense>
  );
}

function TransactionsContent() {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const searchParams = useSearchParams();

  // Show success toast when Polar redirects back after payment
  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      toast.success("Payment successful!", {
        description: "Your credits will be added to your account shortly. Please refresh if they don't appear.",
        duration: 8000,
      });
      // Clean up the URL so a refresh doesn't re-trigger the toast
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("customer_session_token"); // strip Polar's token too
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/sign-in");
    }
  }, [session, sessionLoading, router]);

  // Fetch transactions
  useEffect(() => {
    if (!session?.user) return;

    setLoading(true);
    fetch("/api/transactions")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load transactions");
        return r.json();
      })
      .then((data: Transaction[]) => setTransactions(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  // Download invoice as PDF
  const handleDownloadInvoice = async (tx: Transaction) => {
    setDownloadingId(tx.id);
    try {
      const res = await fetch(`/api/transactions/${tx.id}/invoice`);
      if (!res.ok) throw new Error("Failed to generate invoice");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const invoiceFilename = `${formatInvoiceId(tx.createdAt, tx.id)}.pdf`;
      const a = document.createElement("a");
      a.href = url;
      a.download = invoiceFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silent — browser already shows network errors
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Loading state ───────────────────────────────────────────────────
  if (sessionLoading || (loading && !error)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* ── Page Header ─────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Transactions
            </h1>
            <p className="text-sm text-muted-foreground">
              A full history of your credit purchases and payments.
            </p>
          </div>
        </div>

        {/* ── Error ───────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────── */}
        {!error && (
          <section className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            {transactions.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center">
                  <PackageOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  No transactions yet
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Your purchase history will appear here.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 gap-1.5"
                  onClick={() => router.push("/")}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Get Credits
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-5 w-[150px]">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Package
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Invoice ID
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Method
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Amount
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pr-5 text-right">
                      Download
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow
                      key={tx.id}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors last:border-b-0"
                    >
                      <TableCell className="pl-5 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium">
                            {format(new Date(tx.createdAt), "MMM d, yyyy")}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            {format(new Date(tx.createdAt), "h:mm a")}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold">
                            {formatPackageName(
                              tx.creditAmount,
                              tx.paymentProvider
                            )}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <span className="text-xs font-medium tabular-nums tracking-wide">
                          {formatInvoiceId(tx.createdAt, tx.id)}
                        </span>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <span className="text-xs font-medium">
                          {formatPaymentMethod(tx.paymentProvider, tx.paymentProviderRef)}
                        </span>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <span className="text-xs font-bold tabular-nums">
                          {formatAmount(tx.amount, tx.currency)}
                        </span>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <StatusBadge
                          status={tx.paymentStatus as PaymentStatus}
                        />
                      </TableCell>

                      <TableCell className="pr-5 py-3.5 text-right">
                        {tx.paymentStatus === "paid" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                            onClick={() => handleDownloadInvoice(tx)}
                            disabled={downloadingId === tx.id}
                            title="Download Invoice PDF"
                          >
                            {downloadingId === tx.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FileDown className="h-3.5 w-3.5" />
                            )}
                            Invoice
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground/50 pr-2">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
