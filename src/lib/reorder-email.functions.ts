import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReorderMailStatus = {
  /** Notifications recorded but not yet emailed. */
  queued: number;
  /** Notifications whose delivery attempt failed. */
  failed: number;
  /** Most recent successful send, ISO timestamp. */
  lastSentAt: string | null;
};

/**
 * Read only view of the reorder mail queue for the in app banner. Delivery
 * itself is performed by the scheduled job at
 * /api/public/hooks/send-reorder-emails, never by the browser session.
 */
export const getReorderMailStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReorderMailStatus> => {
    const [{ count: queued }, { count: failed }, { data: lastSent }] = await Promise.all([
      context.supabase
        .from("reorder_notifications")
        .select("id", { count: "exact", head: true })
        .eq("email_status", "Logged"),
      context.supabase
        .from("reorder_notifications")
        .select("id", { count: "exact", head: true })
        .eq("email_status", "Failed"),
      context.supabase
        .from("reorder_notifications")
        .select("sent_at")
        .eq("email_status", "Sent")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      queued: queued ?? 0,
      failed: failed ?? 0,
      lastSentAt: lastSent?.sent_at ?? null,
    };
  });
