export const TIER_PRODUCT_IDS = ["basic", "standard", "premium"] as const;
export type TierProductId = (typeof TIER_PRODUCT_IDS)[number];

export function tierLabel(productId: string): string {
  const id = productId.toLowerCase();
  if (id === "basic") return "Basic";
  if (id === "standard") return "Standard";
  if (id === "premium") return "Premium";
  return productId;
}

/** Amount in Nigerian kobo (integer) for Paystack `amount`. */
export function amountKoboForTier(productId: string): number | null {
  switch (productId.toLowerCase()) {
    case "basic":
      return 1_000_000; // ₦10,000
    case "standard":
      return 2_500_000; // ₦25,000
    case "premium":
      return 5_000_000; // ₦50,000
    default:
      return null;
  }
}

export function formatNgnFromKobo(kobo: number): string {
  const n = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
}
