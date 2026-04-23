import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatInvoiceId(dateString: string | Date, id: number): string {
  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `INV-${yyyy}${mm}${dd}-${10000 + id}`;
}

export function formatPaymentMethod(provider: string, providerRef: string | null): string {
  if (provider === "polar") {
    return "Credit Card";
  }
  if (provider === "pakasir") {
    if (!providerRef) return "-";
    if (providerRef.toLowerCase() === "qris") return "QRIS";
    if (providerRef.toLowerCase() === "bca_va") return "BCA VA";
    // General fallback
    return providerRef
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return "-";
}
