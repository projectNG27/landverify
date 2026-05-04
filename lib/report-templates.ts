import type { ProductId } from "@/lib/products";
import { PRODUCTS } from "@/lib/products";

export type ReportSectionDepth = "none" | "brief" | "standard" | "deep";

export type ReportTemplateSection = {
  id: string;
  title: string;
  /** Plain language: what this part of the report helps the reader understand */
  informsPublic: string;
  /** How strongly this section appears for each tier */
  depth: Record<ProductId, ReportSectionDepth>;
  /** Optional extra line per tier (shown under the badge when present) */
  tierNote?: Partial<Record<ProductId, string>>;
};

export const REPORT_TEMPLATE_SECTIONS: ReportTemplateSection[] = [
  {
    id: "scope",
    title: "Request summary & scope",
    informsPublic:
      "Confirms what you asked us to review, which product you purchased, and the boundaries of the assignment so expectations stay clear.",
    depth: { basic: "brief", standard: "standard", premium: "standard" },
  },
  {
    id: "documents",
    title: "Document inventory & consistency",
    informsPublic:
      "Lists what you submitted and notes whether names, dates, descriptions, and references line up—or where paperwork conflicts or is silent.",
    depth: { basic: "brief", standard: "deep", premium: "deep" },
    tierNote: {
      basic: "High-level pass: major gaps and obvious mismatches, not a full chain narrative.",
      premium: "Deeper narrative where the file is complex (multiple transfers, addenda, or annexes).",
    },
  },
  {
    id: "location",
    title: "Location & parcel context",
    informsPublic:
      "Summarises how the land is described on paper versus maps, coordinates, or directions you provided—so “where this is” is easier to reason about.",
    depth: { basic: "brief", standard: "standard", premium: "deep" },
    tierNote: {
      basic: "Uses your written description and any links; less cross-check detail than higher tiers.",
    },
  },
  {
    id: "findings",
    title: "Structured findings & risk signals",
    informsPublic:
      "Presents observations in a consistent framework: what looks aligned, what looks uncertain, and what would worry a careful buyer.",
    depth: { basic: "standard", standard: "deep", premium: "deep" },
  },
  {
    id: "gaps",
    title: "Gaps, conflicts & missing evidence",
    informsPublic:
      "Calls out missing documents, broken chains, or contradictory statements—so you know what still needs answers before you pay.",
    depth: { basic: "brief", standard: "standard", premium: "deep" },
  },
  {
    id: "next_steps",
    title: "Suggested next steps",
    informsPublic:
      "Practical pointers for your lawyer, seller, or family: questions to ask, items to request, or checks to complete locally.",
    depth: { basic: "brief", standard: "standard", premium: "deep" },
    tierNote: {
      premium: "More tailored guidance when the matter is high-value or unusually layered.",
    },
  },
  {
    id: "limitations",
    title: "Limitations, definitions & disclaimer",
    informsPublic:
      "States what LandVerify is not (for example, not a government certificate of title) and how to interpret language like “risk-based insight.”",
    depth: { basic: "standard", standard: "standard", premium: "standard" },
  },
];

export const REPORT_TEMPLATE_INTROS: Record<
  ProductId,
  { headline: string; body: string; audience: string }
> = {
  basic: {
    headline: "Basic Land Risk Check — report focus",
    body: "Designed for early screening before you sink more time or money. The written output stays structured and honest about limits: it highlights major red flags and alignment issues without pretending to be an exhaustive title investigation.",
    audience: "Best when you want a first read before deeper spend.",
  },
  standard: {
    headline: "Standard Verification Report — report focus",
    body: "Balanced depth for most buyers: clearer document narrative, stronger location cross-check, and findings you can share with counsel or family. Still independent insight—not a substitute for legal advice or registry guarantees.",
    audience: "Recommended default for typical purchases.",
  },
  premium: {
    headline: "Premium Verification Report — report focus",
    body: "Highest practical depth when stakes are higher or the file is messy. Expect more elaboration on conflicts, location nuance, and next-step guidance—within the same ethical boundaries as other tiers.",
    audience: "Complex plots, higher value, or heavier document bundles.",
  },
};

export function depthLabel(depth: ReportSectionDepth): { label: string; description: string } {
  switch (depth) {
    case "none":
      return { label: "Not a focus in this tier", description: "May appear only as a short cross-reference elsewhere." };
    case "brief":
      return { label: "Brief", description: "Short section: key points only." };
    case "standard":
      return { label: "Standard detail", description: "Full section with practical detail most buyers need." };
    case "deep":
      return { label: "Extended detail", description: "Richer narrative and more granular notes where materials allow." };
  }
}

export function normalizeReportProductId(raw: string | undefined): ProductId {
  const id = raw?.toLowerCase().trim();
  if (id === "basic" || id === "standard" || id === "premium") return id;
  return "standard";
}

export function productMeta(productId: ProductId) {
  return PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[1];
}
