import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetchPatientIntakes } from "@/lib/patient-intakes";
import { formatDate, formatDateTime } from "@/lib/au";

export const Route = createFileRoute("/_authenticated/patient-intakes/")({
  head: () => ({ meta: [{ title: "Patient Intake | Good Practice GP Surgery" }] }),
  component: PatientIntakesPage,
});

function PatientIntakesPage() {
  const [query, setQuery] = useState("");
  const intakeQuery = useQuery({ queryKey: ["patient-intakes"], queryFn: fetchPatientIntakes });
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (intakeQuery.data ?? []).filter(
      (row) =>
        !q ||
        `${row.first_name} ${row.last_name} ${row.phone} ${row.email ?? ""}`
          .toLowerCase()
          .includes(q),
    );
  }, [intakeQuery.data, query]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy sm:text-2xl">Patient intake</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Secure staff access only. {rows.length} record{rows.length === 1 ? "" : "s"} shown.
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/patient-intakes/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New patient intake
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, phone or email"
            />
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="p-3">Patient</th>
                <th className="p-3">Date of birth</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
                <th className="p-3">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {intakeQuery.isLoading ? (
                <tr>
                  <td className="p-5 text-muted-foreground" colSpan={6}>
                    Loading patient intake records...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="p-5 text-muted-foreground" colSpan={6}>
                    No patient intake records found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="p-3 font-medium">
                      {row.last_name}, {row.first_name}
                    </td>
                    <td className="p-3">{formatDate(row.date_of_birth)}</td>
                    <td className="p-3">{row.phone}</td>
                    <td className="p-3">
                      <Badge variant="outline">{row.status}</Badge>
                    </td>
                    <td className="p-3">{formatDateTime(row.created_at)}</td>
                    <td className="p-3 text-right">
                      <Link
                        to="/patient-intakes/$intakeId"
                        params={{ intakeId: row.id }}
                        className="font-semibold text-teal hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
