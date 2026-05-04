export const PRODUCTS = [
  {
    id: "basic" as const,
    name: "Basic Land Risk Check",
    priceLabel: "₦10,000",
    timeline: "3–5 business days",
  },
  {
    id: "standard" as const,
    name: "Standard Verification Report",
    priceLabel: "₦25,000",
    timeline: "5–7 business days",
  },
  {
    id: "premium" as const,
    name: "Premium Verification Report",
    priceLabel: "₦50,000+",
    timeline: "7–10 business days",
  },
] as const;

export type ProductId = (typeof PRODUCTS)[number]["id"];
