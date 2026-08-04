import { supabase } from "@/integrations/supabase/client";

export const AUDIT_ACTIONS = [
  "Login",
  "Logout",
  "Create",
  "Edit",
  "Delete",
  "Purchase",
  "Stock Adjustment",
  "Export",
  "User Created",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export async function logAudit(
  action: AuditAction,
  entity: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("audit_logs").insert({
      user_id: data.user.id,
      user_email: data.user.email ?? "",
      action,
      entity,
      entity_id: entityId,
      details: details as never,
    });
  } catch {
    // auditing must never block the user action
  }
}
