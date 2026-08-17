import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  Package,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  MailWarning,
  ClipboardPlus,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { useAuth } from "@/hooks/useAuth";
import { getReorderMailStatus } from "@/lib/reorder-email.functions";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string; icon: typeof Package; adminOnly?: boolean };

const NAV: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Medical Supplies", to: "/supplies", icon: Package },
  { label: "Patient Intake", to: "/patient-intakes", icon: ClipboardPlus },
  { label: "Audit Log", to: "/audit", icon: ScrollText, adminOnly: true },
  { label: "Settings", to: "/settings", icon: Settings, adminOnly: true },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { label: "Home", to: "/dashboard", icon: LayoutDashboard },
    { label: "Patients", to: "/patient-intakes", icon: ClipboardPlus },
    { label: "New intake", to: "/patient-intakes/new", icon: PlusCircle },
    { label: "Supplies", to: "/supplies", icon: Package },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-panel backdrop-blur lg:hidden"
    >
      {items.map((item) => {
        const active =
          item.to === "/patient-intakes/new"
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold",
              active ? "text-alert" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function ReorderMailBanner() {
  const [dismissed, setDismissed] = useState(false);
  const status = useServerFn(getReorderMailStatus);

  const { data } = useQuery({
    queryKey: ["reorder-mail-status"],
    queryFn: () => status({}),
    refetchInterval: 120_000,
  });

  const queued = data?.queued ?? 0;
  const failed = data?.failed ?? 0;
  if (dismissed || queued + failed === 0) return null;

  return (
    <div className="flex items-start gap-3 border-b border-alert/30 bg-alert-soft px-4 py-3 sm:px-6">
      <MailWarning className="mt-0.5 h-4.5 w-4.5 shrink-0 text-alert" />
      <p className="flex-1 text-sm text-foreground">
        <span className="font-semibold text-alert">Reorder emails are waiting to be sent. </span>
        {queued} notification{queued === 1 ? "" : "s"} queued
        {failed > 0 ? ` and ${failed} failed` : ""}. Every notification is recorded in the system
        and the scheduled mailer retries automatically. Delivery to info@goodpracticegp.com.au
        starts once the sending domain notify.goodpracticegp.com.au is verified in Cloud then
        Emails.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss email delivery notice"
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-alert/10 hover:text-alert"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, role, fullName, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setMobileOpen(false), [pathname]);

  const { data: reorderCount = 0 } = useQuery({
    queryKey: ["reorder-count"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { count } = await supabase
        .from("medical_supply_items")
        .select("id", { count: "exact", head: true })
        .in("status", ["Reorder Required", "Out of Stock"]);
      return count ?? 0;
    },
  });

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-4 text-sidebar-foreground">
          <BrandMark />
        </div>
        <NavLinks />
        <div className="mt-auto p-4 text-xs text-sidebar-foreground/60">
          Administration System
          <br />
          Sydney, Australia
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-sidebar shadow-panel">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 text-sidebar-foreground">
              <BrandMark />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="rounded p-1 text-sidebar-foreground/80 hover:bg-sidebar-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-foreground hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <BrandMark className="text-navy lg:hidden" />
            <div className="hidden lg:block">
              <h2 className="text-sm font-semibold text-navy">
                Medical Centre Administration System
              </h2>
              <p className="text-xs text-muted-foreground">Quality Care. Close to Home.</p>
            </div>
          </div>

          {reorderCount > 0 && (
            <Link
              to="/supplies"
              search={{ status: "Reorder Required" } as never}
              className="hidden items-center gap-1.5 rounded-full bg-alert-soft px-3 py-1.5 text-xs font-semibold text-alert sm:flex"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {reorderCount} need attention
            </Link>
          )}

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-sm font-semibold leading-tight">
                {fullName || user?.email}
              </p>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
                role === "admin" ? "bg-navy text-navy-foreground" : "bg-teal text-teal-foreground",
              )}
            >
              {role ?? "no role"}
            </span>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        <ReorderMailBanner />

        <main className="flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:pb-6">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
