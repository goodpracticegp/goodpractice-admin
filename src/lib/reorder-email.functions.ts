import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReorderMailResult = {
  processed: number;
  sent: number;
  failed: number;
  needsApiKey: boolean;
};

/**
 * Sends the queued "Reorder Required" emails to info@goodpracticegp.com.au.
 * Notification rows are always written by the database automation, so a missing
 * or failing Resend key never loses the reorder record.
 */
export const sendReorderEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReorderMailResult> => {
    const recipient = "info@goodpracticegp.com.au";
    const apiKey = process.env["RESEND_API_KEY"];

    const { data: pending, error } = await context.supabase
      .from("reorder_notifications")
      .select("*")
      .eq("email_status", "Logged")
      .order("created_at", { ascending: true })
      .limit(25);

    if (error) throw new Error(error.message);
    const rows = pending ?? [];

    if (!apiKey) {
      return { processed: rows.length, sent: 0, failed: 0, needsApiKey: rows.length > 0 };
    }
    if (rows.length === 0) {
      return { processed: 0, sent: 0, failed: 0, needsApiKey: false };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildReorderEmailHtml } = await import("./reorder-email-template.server");

    let sent = 0;
    let failed = 0;

    for (const row of rows) {
      let status = "Failed";
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Good Practice GP Surgery <procurement@goodpracticegp.com.au>",
            to: [recipient],
            subject: `Reorder Required: ${row.item_code} ${row.item_description}`,
            html: buildReorderEmailHtml(row),
          }),
        });
        status = response.ok ? "Sent" : "Failed";
      } catch {
        status = "Failed";
      }

      if (status === "Sent") sent += 1;
      else failed += 1;

      await supabaseAdmin
        .from("reorder_notifications")
        .update({ email_status: status, sent_at: new Date().toISOString() })
        .eq("id", row.id);
    }

    return { processed: rows.length, sent, failed, needsApiKey: false };
  });
