import type { ProductId } from "@/lib/products";

export const TIER_SLA_DAYS: Record<ProductId, number> = {
  basic: 5,
  standard: 7,
  premium: 10,
};

export function computeSlaDueAt(baseIso: string | Date, productId: ProductId): string {
  const base = typeof baseIso === "string" ? new Date(baseIso) : new Date(baseIso);
  const due = new Date(base.getTime() + TIER_SLA_DAYS[productId] * 24 * 60 * 60 * 1000);
  return due.toISOString();
}

export function getRemainingMs(dueAt: string | null): number | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;
  return due.getTime() - Date.now();
}

export function formatRemaining(dueAt: string | null): { text: string; urgent: boolean; overdue: boolean } {
  const ms = getRemainingMs(dueAt);
  if (ms === null) return { text: "No deadline", urgent: false, overdue: false };
  if (ms < 0) {
    const hours = Math.floor(Math.abs(ms) / (60 * 60 * 1000));
    return { text: `Overdue by ${hours}h`, urgent: true, overdue: true };
  }
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  if (days >= 1) {
    return { text: `${days}d remaining`, urgent: hours <= 48, overdue: false };
  }
  return { text: `${hours}h remaining`, urgent: hours <= 48, overdue: false };
}
