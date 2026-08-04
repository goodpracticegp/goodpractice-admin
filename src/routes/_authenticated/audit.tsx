import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/au";
import { exportCsv, type ExportColumn } from "@/lib/export";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import type { Tables } from "@/integrations/supabase/types";

type AuditRow = Tables<"audit_logs">;

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log | Good Practice (GP) Surgery Administration" },
      {
        name: "description",
        content:
          "Administrator audit trail of every create, edit, delete, purchase, login and export in the GP Surgery administration system.",
      },
      { property: "og:title", content: "Audit Log | Good Practice (GP) Surgery" },
      {
        property: "og:description",
        content: "Administrator audit trail for the GP Surgery administration system.",
      },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { isAdmin } = useAuth();
  const [userFilter, setUserFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const logsQuery = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const logs = logsQuery.data ?? [];
  const users = useMemo(
    () => Array.from(new Set(logs.map((l) => l.user_email ?? "unknown"))).sort(),
    [logs],
  );

  const filtered = logs.filter((row) => {
    const email = row.user_email ?? "unknown";
    if (userFilter !== "all" && email !== userFilter) return false;
    if (actionFilter !== "all" && row.action !== actionFilter) return false;
    const day = row.created_at.slice(0, 10);
    if (fromDate && day < fromDate) return false;
    if (toDate && day > toDate) return false;
    return true;
  });

  const columns: ExportColumn<AuditRow>[] = [
    { header: "Date and Time (Sydney)", value: (r) => formatDateTime(r.created_at) },
    { header: "User", value: (r) => r.user_email ?? "unknown" },
    { header: "Action", value: (r) => r.action },
    { header: "Entity", value: (r) => r.entity ?? "" },
    { header: "Entity ID", value: (r) => r.entity_id ?? "" },
    { header: "Details", value: (r) => (r.details ? JSON.stringify(r.details) : "") },
  ];

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-lg shadow-card">
        <CardContent className="space-y-3 p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-alert" />
          <h1 className="text-lg font-semibold text-navy">Administrator access only</h1>
          <p className="text-sm text-muted-foreground">
            The audit log is available to practice administrators.
          </p>
          <Link to="/dashboard" className="inline-block text-sm font-semibold text-teal">
            Return to dashboard
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy sm:text-2xl">Audit log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} of {logs.length} entries shown, all times in Sydney time
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            exportCsv(filtered, columns, "gp-surgery-audit-log.csv");
            await logAudit("Export", "audit_logs", null, { rows: filtered.length, format: "csv" });
            toast.success(`Exported ${filtered.length} audit entries`);
          }}
        >
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>User</Label>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {AUDIT_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="from-date">From date</Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to-date">To date</Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date and time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="min-w-[260px]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No audit entries match these filters.
                  </TableCell>
                </TableRow>
              )}
              {filtered.slice(0, 200).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDateTime(row.created_at)}
                  </TableCell>
                  <TableCell className="text-sm">{row.user_email ?? "unknown"}</TableCell>
                  <TableCell className="text-sm font-semibold text-navy">{row.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.entity ?? ""}</TableCell>
                  <TableCell className="max-w-[420px] truncate text-xs text-muted-foreground">
                    {row.details ? JSON.stringify(row.details) : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 200 && (
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Showing the 200 most recent matching entries. Export to CSV for the full filtered set.
          </p>
        )}
      </Card>
    </div>
  );
}
