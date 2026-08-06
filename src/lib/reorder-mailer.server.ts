import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildReorderEmailHtml, buildReorderEmailText } from "./reorder-email-template.server";

export const REORDER_RECIPIENT = "info@goodpracticegp.com.au";
/** Delegated sending subdomain managed by Lovable Emails. */
export const SENDER_DOMAIN = "notify.goodpracticegp.com.au";
export const REORDER_FROM = `Good Practice (GP) Surgery <procurement@${SENDER_DOMAIN}>`;

export type ReorderMailResult = {
  processed: number;
  sent: number;
  failed: number;
  /** Rows left queued because sending is not possible yet. */
  pending: number;
  /** Populated when the sending domain or the email service is not ready. */
  blockedReason: string | null;
};

type Blocked = { blocked: true; reason: string };

function classify(error: unknown): Blocked | { blocked: false } {
  const err = error as { code?: string | null; status?: number; message?: string };
  if (err?.code === "domain_not_verified") {
    return {
      blocked: true,
      reason:
        "The sending domain notify.goodpracticegp.com.au is not verified yet, so reorder emails are queued.",
    };
  }
  if (err?.code === "emails_disabled") {
    return { blocked: true, reason: "Email sending is switched off for this project." };
  }
  if (err?.status === 429) {
    return { blocked: true, reason: "Email sending is rate limited. The queue will be retried." };
  }
  return { blocked: false };
}

/**
 * Sends every queued "Reorder Required" notification through Lovable managed
 * email. Runs from the scheduled job, so delivery no longer depends on somebody
 * having the app open. Notification rows are written by the database trigger, so
 * a delivery problem never loses the reorder record.
 */
export async function dispatchPendingReorderEmails(limit = 25): Promise<ReorderMailResult> {
  const { data, error } = await supabaseAdmin
    .from("reorder_notifications")
    .select("*")
    .in("email_status", ["Logged", "Failed"])
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const result: ReorderMailResult = {
    processed: rows.length,
    sent: 0,
    failed: 0,
    pending: rows.length,
    blockedReason: null,
  };
  if (rows.length === 0) return result;

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    result.blockedReason = "Managed email is not configured for this project.";
    return result;
  }

  const { sendLovableEmail } = await import("@lovable.dev/email-js");

  for (const row of rows) {
    try {
      await sendLovableEmail(
        {
          to: REORDER_RECIPIENT,
          from: REORDER_FROM,
          sender_domain: SENDER_DOMAIN,
          subject: `Reorder Required: ${row.item_code} ${row.item_description}`,
          html: buildReorderEmailHtml(row),
          text: buildReorderEmailText(row),
          purpose: "transactional",
          label: "reorder-required",
          idempotency_key: `reorder-${row.id}`,
        },
        { apiKey },
      );
      await supabaseAdmin.rpc("mark_reorder_notification", {
        _notification_id: row.id,
        _status: "Sent",
      });
      result.sent += 1;
      result.pending -= 1;
    } catch (error) {
      const verdict = classify(error);
      if (verdict.blocked) {
        result.blockedReason = verdict.reason;
        break;
      }
      await supabaseAdmin.rpc("mark_reorder_notification", {
        _notification_id: row.id,
        _status: "Failed",
      });
      result.failed += 1;
      result.pending -= 1;
    }
  }

  return result;
}
