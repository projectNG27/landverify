"use server";

import { redirect } from "next/navigation";
import { verifyAgentCredentials } from "@/lib/agent-auth";
import { clearAdminSession, setAgentSession } from "@/lib/admin-auth";

export type AgentAuthState = {
  ok: boolean;
  error?: string;
};

export async function agentLoginAction(_: AgentAuthState, formData: FormData): Promise<AgentAuthState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { ok: false, error: "Enter username and password." };

  const result = await verifyAgentCredentials(username, password);
  if (!result.ok) return { ok: false, error: result.message };

  await setAgentSession(result.agent.username);
  redirect("/agent");
}

export async function agentLogoutAction() {
  await clearAdminSession();
  redirect("/agent/login");
}

