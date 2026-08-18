import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatDateTime } from "@/lib/au";
import { fetchStaffOnboardings } from "@/lib/staff-onboarding";

export const Route = createFileRoute("/_authenticated/staff-onboarding/")({
  head: () => ({ meta: [{ title: "Staff Onboarding | Good Practice GP Surgery" }] }),
  component: StaffOnboardingPage,
});

function StaffOnboardingPage() {
  const { isAdmin } = useAuth();
  const [query, setQuery] = useState("");
  const onboardingQuery = useQuery({
    queryKey: ["staff-onboardings"],
    queryFn: fetchStaffOnboardings,
    enabled: isAdmin,
  });
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (onboardingQuery.data ?? []).filter((row) =>
      !q || `${row.first_name} ${row.last_name} ${row.personal_email} ${row.job_title}`.toLowerCase().includes(q),
    );
  }, [onboardingQuery.data, query]);

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="flex gap-3 p-6">
          <ShieldAlert className="h-6 w-6 shrink-0 text-alert" />
          <div><h1 className="font-bold text-navy">Administrator access required</h1><p className="mt-1 text-sm text-muted-foreground">Staff onboarding records are restricted to authorised administrators.</p></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-xl font-bold text-navy sm:text-2xl">Staff onboarding</h1><p className="mt-1 text-sm text-muted-foreground">Administrator-only employee onboarding and compliance tracking.</p></div>
        <Button asChild size="sm"><Link to="/staff-onboarding/new"><Plus className="mr-1.5 h-4 w-4" />New staff onboarding</Link></Button>
      </div>
      <Card><CardContent className="p-4"><div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employee, email or role" /></div></CardContent></Card>
      <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left"><tr><th className="p-3">Employee</th><th className="p-3">Role</th><th className="p-3">Start date</th><th className="p-3">Status</th><th className="p-3">Created</th></tr></thead>
        <tbody className="divide-y">
          {onboardingQuery.isLoading ? <tr><td colSpan={5} className="p-5 text-muted-foreground">Loading staff onboarding records...</td></tr> :
            onboardingQuery.isError ? <tr><td colSpan={5} className="p-5 text-alert">Unable to load records. {onboardingQuery.error.message}</td></tr> :
            rows.length === 0 ? <tr><td colSpan={5} className="p-5 text-muted-foreground">No staff onboarding records found.</td></tr> : rows.map((row) => (
              <tr key={row.id}><td className="p-3 font-medium">{row.last_name}, {row.first_name}<div className="text-xs font-normal text-muted-foreground">{row.personal_email}</div></td><td className="p-3">{row.job_title}</td><td className="p-3">{formatDate(row.start_date)}</td><td className="p-3"><Badge variant="outline">{row.status}</Badge></td><td className="p-3">{formatDateTime(row.created_at)}</td></tr>
            ))}
        </tbody>
      </table></div></Card>
    </div>
  );
}
