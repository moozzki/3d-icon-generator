import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { transactions, user } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { IDR_PACKAGES, packageDisplayName, IdrPackageId } from "@/lib/pakasir/packages";

// ── Package name resolver ──────────────────────────────────────────────────
// Maps stored creditAmount + provider back to the human-readable Audora plan name.
function resolvePackageName(creditAmount: number, paymentProvider: string): string {
  if (paymentProvider === "pakasir") {
    // Reverse-lookup the packageId whose credit count matches
    const found = (Object.entries(IDR_PACKAGES) as [IdrPackageId, { credits: number }][]).find(
      ([, pkg]) => pkg.credits === creditAmount
    );
    if (found) {
      return `${packageDisplayName(found[0])} Plan`; // e.g. "Starter Plan"
    }
  }
  if (paymentProvider === "polar") {
    // Polar packages mirror the same tier names
    if (creditAmount <= 10)  return "Starter Plan";
    if (creditAmount <= 30)  return "Creator Plan";
    return "Studio Plan";
  }
  // Generic fallback
  return `${creditAmount} Credit${creditAmount !== 1 ? "s" : ""} Pack`;
}

// ── Helpers ────────────────────────────────────────────────────────────────

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

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ── Route Handler ──────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const txId = parseInt(id, 10);
    if (isNaN(txId)) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 });
    }

    // ── Auth ────────────────────────────────────────────────────────────
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Fetch transaction (must belong to this user) ─────────────────────
    const [tx] = await db
      .select({
        id: transactions.id,
        creditAmount: transactions.creditAmount,
        amount: transactions.amount,
        currency: transactions.currency,
        paymentProvider: transactions.paymentProvider,
        paymentStatus: transactions.paymentStatus,
        paymentProviderRef: transactions.paymentProviderRef,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.id, txId),
          eq(transactions.userId, session.user.id)
        )
      )
      .limit(1);

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // ── Fetch user email ─────────────────────────────────────────────────
    const [userRow] = await db
      .select({ email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const userEmail = userRow?.email ?? session.user.email;
    const userName = userRow?.name ?? session.user.name ?? "Customer";

    // ── Generate PDF with jsPDF ─────────────────────────────────────────
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const PAGE_W = doc.internal.pageSize.getWidth();
    const MARGIN = 48;
    const COL2 = PAGE_W - MARGIN;

    // ── Brand header bar ────────────────────────────────────────────────
    doc.setFillColor(73, 73, 255); // Audora brand purple
    doc.rect(0, 0, PAGE_W, 72, "F");

    // Brand name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("Audora", MARGIN, 44);

    // Tagline
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 255);
    doc.text("AI 3D Isometric Icon Generator", MARGIN, 60);

    // "INVOICE" label on the right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("INVOICE", COL2, 44, { align: "right" });

    // ── Invoice meta ─────────────────────────────────────────────────────
    let y = 110;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(`Invoice #${tx.id}`, MARGIN, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 110);
    doc.text(
      `Issued: ${format(new Date(tx.createdAt!), "MMMM d, yyyy · h:mm a")}`,
      MARGIN,
      y + 16
    );

    // ── Divider ──────────────────────────────────────────────────────────
    y += 44;
    doc.setDrawColor(220, 220, 230);
    doc.setLineWidth(0.75);
    doc.line(MARGIN, y, COL2, y);

    // ── Bill To section ──────────────────────────────────────────────────
    y += 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 155);
    doc.text("BILL TO", MARGIN, y);

    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(userName, MARGIN, y);

    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 95);
    doc.text(userEmail, MARGIN, y);

    // ── Transaction details table ─────────────────────────────────────────
    y += 36;
    doc.setFillColor(248, 248, 252);
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 32, 4, 4, "F");

    // Table headers
    const col1X = MARGIN + 12;
    const col2X = MARGIN + 220;
    const col3X = MARGIN + 340;
    const col4X = COL2 - 12;

    y += 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 115);
    doc.text("DESCRIPTION", col1X, y);
    doc.text("DATE", col2X, y);
    doc.text("STATUS", col3X, y);
    doc.text("AMOUNT", col4X, y, { align: "right" });

    // Table row
    y += 14;
    doc.setDrawColor(220, 220, 230);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y - 8, COL2, y - 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);

    const packageLabel = `${resolvePackageName(tx.creditAmount, tx.paymentProvider)} · ${tx.creditAmount} Credit${tx.creditAmount !== 1 ? "s" : ""}`;

    doc.text(packageLabel, col1X, y + 14);
    doc.text(
      format(new Date(tx.createdAt!), "MMM d, yyyy"),
      col2X,
      y + 14
    );

    // Status with color
    const statusColors: Record<string, [number, number, number]> = {
      paid: [16, 185, 129],
      pending: [245, 158, 11],
      cancelled: [113, 113, 122],
      expired: [239, 68, 68],
    };
    const [r2, g2, b2] = statusColors[tx.paymentStatus] ?? [100, 100, 100];
    doc.setTextColor(r2, g2, b2);
    doc.setFont("helvetica", "bold");
    doc.text(statusLabel(tx.paymentStatus), col3X, y + 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(formatAmount(tx.amount, tx.currency), col4X, y + 14, {
      align: "right",
    });

    y += 38;
    doc.setLineWidth(0.75);
    doc.setDrawColor(220, 220, 230);
    doc.line(MARGIN, y, COL2, y);

    // ── Total row ─────────────────────────────────────────────────────────
    y += 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 95);
    doc.text("TOTAL", col3X, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(73, 73, 255);
    doc.text(formatAmount(tx.amount, tx.currency), col4X, y, {
      align: "right",
    });

    // ── Payment provider ref ──────────────────────────────────────────────
    if (tx.paymentProviderRef) {
      y += 36;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 155);
      doc.text(`Payment Ref: ${tx.paymentProviderRef}`, MARGIN, y);
    }

    // ── Footer ─────────────────────────────────────────────────────────────
    const PAGE_H = doc.internal.pageSize.getHeight();
    doc.setFillColor(248, 248, 252);
    doc.rect(0, PAGE_H - 52, PAGE_W, 52, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 155);
    doc.text(
      "Thank you for using Audora! Questions? Contact us at support@useaudora.com",
      PAGE_W / 2,
      PAGE_H - 30,
      { align: "center" }
    );
    doc.text(
      "© Audora · useaudora.com",
      PAGE_W / 2,
      PAGE_H - 16,
      { align: "center" }
    );

    // ── Output PDF buffer ─────────────────────────────────────────────────
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="audora-invoice-${tx.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/transactions/[id]/invoice] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
