/**
 * Mailgun HTTP API (EU/US: set MAILGUN_API_BASE if your domain is on EU).
 * https://documentation.mailgun.com/en/latest/api-sending.html
 */

function trimmed(name: string): string | undefined {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export function isMailgunConfigured(): boolean {
  return Boolean(trimmed("MAILGUN_API_KEY") && trimmed("MAILGUN_DOMAIN") && trimmed("MAILGUN_FROM_EMAIL"));
}

export type SendMailgunEmailParams = {
  to: string;
  subject: string;
  text: string;
};

/** Returns true if sent, false if Mailgun env missing (caller may log). */
export async function sendMailgunEmail(params: SendMailgunEmailParams): Promise<boolean> {
  const apiKey = trimmed("MAILGUN_API_KEY");
  const domain = trimmed("MAILGUN_DOMAIN");
  const from = trimmed("MAILGUN_FROM_EMAIL");
  if (!apiKey || !domain || !from) {
    console.warn("mailgun: missing MAILGUN_API_KEY, MAILGUN_DOMAIN, or MAILGUN_FROM_EMAIL — skip send");
    return false;
  }

  const base = trimmed("MAILGUN_API_BASE") || "https://api.mailgun.net";
  const url = `${base.replace(/\/$/, "")}/v3/${encodeURIComponent(domain)}/messages`;

  const body = new URLSearchParams();
  body.set("from", from);
  body.set("to", params.to);
  body.set("subject", params.subject);
  body.set("text", params.text);

  const auth = Buffer.from(`api:${apiKey}`).toString("base64");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("mailgun: send failed", res.status, errText.slice(0, 500));
      return false;
    }
    return true;
  } catch (e) {
    console.error("mailgun: network error", e);
    return false;
  }
}
