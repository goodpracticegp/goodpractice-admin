import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/BrandMark";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff Sign In | Good Practice (GP) Surgery Administration" },
      {
        name: "description",
        content:
          "Secure staff sign in for the Good Practice (GP) Surgery medical centre administration system.",
      },
      { property: "og:title", content: "Staff Sign In | Good Practice (GP) Surgery" },
      {
        property: "og:description",
        content: "Secure staff sign in for the Good Practice GP Surgery administration system.",
      },
    ],
  }),
  component: AuthPage,
});

const DEMO = [
  { label: "Administrator", email: "admin@goodpracticegp.com.au", password: "GPAdmin2026!" },
  { label: "Staff", email: "staff@goodpracticegp.com.au", password: "GPStaff2026!" },
];

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter your work email address and password.");
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setSubmitting(false);

    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes("invalid")
          ? "Those sign in details are not correct. Please check and try again."
          : signInError.message,
      );
      return;
    }

    await logAudit("Login", "auth", null, { email: email.trim().toLowerCase() });
    toast.success("Signed in successfully");
    void navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-panel">
            <div className="bg-navy px-6 py-6 text-navy-foreground">
              <BrandMark />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div>
                <h1 className="text-lg font-semibold text-navy">Staff sign in</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Administration System access is restricted to practice staff. Accounts are created
                  by a practice administrator.
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

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  <Lock className="mr-2 h-4 w-4" />
                )}
                Sign in
              </Button>

              <div className="rounded-md border border-dashed border-border bg-muted/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Demo credentials
                </p>
                <ul className="mt-2 space-y-1.5">
                  {DEMO.map((account) => (
                    <li key={account.email} className="text-xs text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(account.email);
                          setPassword(account.password);
                        }}
                        className="text-left font-medium text-teal underline-offset-2 hover:underline"
                      >
                        {account.label}: {account.email} / {account.password}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
