export const COMPANY = {
  productName: "LandVerify",
  legalName: "Axiomate Limited",
  cac: "9353281",
  supportEmail: "support@landverify.ng",
} as const;

/** States where verification requests are accepted for the current product phase. */
export const SUPPORTED_STATES = [
  { name: "Lagos", code: "LA" },
  { name: "Ogun", code: "OG" },
  { name: "Oyo", code: "OY" },
  { name: "Osun", code: "OS" },
] as const;
