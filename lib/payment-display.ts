/** Human-readable label for Paystack-derived `card_origin` + `channel`. */
export function paymentChannelLabel(cardOrigin: string | null, channel: string | null): string {
  if (cardOrigin === "local") return "Domestic card (NG)";
  if (cardOrigin === "international") return "International card";
  if (cardOrigin === "non_card") {
    if (channel) return channel.replace(/_/g, " ");
    return "Bank or non-card payment";
  }
  if (channel) return `${channel.replace(/_/g, " ")} (card region not reported)`;
  return "—";
}
