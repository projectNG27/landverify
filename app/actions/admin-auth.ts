"use server";

import { redirect } from "next/navigation";
import { clearAdminSession, setAdminSession, validateAdminCredentials } from "@/lib/admin-auth";

export type AdminAuthState = {
  ok: boolean;
  error?: string;
};

export async function adminLoginAction(_: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { ok: false, error: "Enter your admin username and password." };
  }
  try {
    const valid = validateAdminCredentials(username, password);
    if (!valid) return { ok: false, error: "Invalid credentials." };
    await setAdminSession(username);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to sign in right now.",
    };
  }
  redirect("/admin");
}

export async function adminLogoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

