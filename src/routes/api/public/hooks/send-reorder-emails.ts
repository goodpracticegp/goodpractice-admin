import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled reorder mailer. Called every 15 minutes by the database scheduler
 * (pg_cron) so queued "Reorder Required" notifications are emailed to
 * info@goodpracticegp.com.au whether or not anybody has the app open.
 *
 * The caller must present the project publishable key in the apikey header.
 */
export const Route = createFileRoute("/api/public/hooks/send-reorder-emails")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"] ?? "";
        const presented =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";

        if (!expected || presented !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorised" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const { dispatchPendingReorderEmails } = await import("@/lib/reorder-mailer.server");
          const result = await dispatchPendingReorderEmails();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          console.error("send-reorder-emails failed:", message);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
