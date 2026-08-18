import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, MailCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff Sign In | Good Practice (GP) Surgery Administration" },
      {
        name: "description",
        content:
          "Secure email link sign in for authorised administrators of the Good Practice (GP) Surgery medical centre administration system.",
      },
      { property: "og:title", content: "Staff Sign In | Good Practice (GP) Surgery" },
      {
        property: "og:description",
        content:
          "Secure email link sign in for authorised administrators of the Good Practice GP Surgery administration system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const AUTHORISED_EMAIL = "support@goodpracticegp.com.au";

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const value = email.trim().toLowerCase();
    if (!value) {
      setError("Enter your work email address.");
      return;
    }

    if (value !== AUTHORISED_EMAIL) {
      setError(
        "Access is restricted to authorised practice administrators. No sign in link has been sent.",
      );
      return;
    }

    setSubmitting(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: value,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: window.location.origin,
      },
    });
    setSubmitting(false);

    if (otpError) {
      setError(
        otpError.message.toLowerCase().includes("rate")
          ? "Too many sign in links have been requested. Please wait a few minutes and try again."
          : otpError.message,
      );
      return;
    }

    setSent(true);
    toast.success("Sign in link sent");
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-panel">
            <div className="bg-navy px-6 py-6 text-navy-foreground">
              <BrandMark />
            </div>

            {sent ? (
              <div className="space-y-4 p-6">
                <div className="flex items-center gap-2 text-teal">
                  <MailCheck className="h-5 w-5" />
                  <h1 className="text-lg font-semibold text-navy">Check your email</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  A single use sign in link has been sent to{" "}
                  <span className="font-medium text-foreground">{AUTHORISED_EMAIL}</span>. Open the
                  email on this device and select the link to access the Administration System.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSent(false);
                    setError(null);
                  }}
                >
                  Send another link
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 p-6">
                <div>
                  <h1 className="text-lg font-semibold text-navy">Administrator sign in</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter your work email address and we will send you a secure sign in link. Access
                    is limited to authorised practice administrators.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Work email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@goodpracticegp.com.au"
                  />
                </div>

                {error && (
                  <p role="alert" className="rounded-md bg-alert-soft px-3 py-2 text-sm text-alert">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send sign in link
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

