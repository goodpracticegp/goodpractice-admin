import { supabase } from "@/integrations/supabase/client";

/**
 * Audit trail actions. Create, Edit, Delete, Restore, Purchase and
 * Stock Adjustment entries are written by database triggers and cannot be
 * produced or suppressed by the client. Only events the database cannot
 * observe are logged from the app, through the checked log_client_event helper.
 */
export const AUDIT_ACTIONS = [
  "Login",
  "Logout",
  "Create",
  "Edit",
  "Delete",
  "Restore",
  "Purchase",
  "Stock Adjustment",
  "Export",
  "User Created",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Actions the client is permitted to record (mirrors log_client_event). */
export type ClientAuditAction = "Login" | "Logout" | "Export";

export async function logAudit(
  action: ClientAuditAction,
  entity: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
) {
  try {
    await supabase.rpc("log_client_event", {
      _action: action,
      _entity: entity,
      _details: details as never,
      ...(entityId ? { _entity_id: entityId } : {}),
    });
  } catch {
    // auditing must never block the user action
  }
}
