export type PasswordHintLevel = "empty" | "weak" | "fair" | "strong";

export type PasswordHint = {
  level: PasswordHintLevel;
  /** Short label for the UI */
  summary: string;
  /** Extra bullets when weak */
  issues: string[];
};

/** Client-side hints only; server still enforces min 8 characters. */
export function evaluatePasswordHint(password: string): PasswordHint {
  if (!password) {
    return { level: "empty", summary: "", issues: [] };
  }

  const issues: string[] = [];
  if (password.length < 8) issues.push("Use at least 8 characters");
  if (!/[a-zA-Z]/.test(password)) issues.push("Add a letter");
  if (!/\d/.test(password)) issues.push("Add a number");

  if (issues.length > 0) {
    return { level: "weak", summary: "Weak password", issues };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const longEnough = password.length >= 12;
  const varied = (hasUpper && hasLower) || hasSymbol;

  if (longEnough && varied) {
    return { level: "strong", summary: "Strong password", issues: [] };
  }

  return {
    level: "fair",
    summary: "Okay — add length, mixed case, or a symbol for a stronger password",
    issues: [],
  };
}
