import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPatientIntake } from "@/lib/patient-intakes";
import { formatDate, formatDateTime } from "@/lib/au";

export const Route = createFileRoute("/_authenticated/patient-intakes/$intakeId/")({
  head: () => ({ meta: [{ title: "Patient Intake Record | Good Practice GP Surgery" }] }),
  component: PatientIntakeDetailPage,
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b py-2.5 last:border-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 whitespace-pre-wrap text-sm">{value || "Not recorded"}</div>
    </div>
  );
}

function PatientIntakeDetailPage() {
  const { intakeId } = Route.useParams();
  const query = useQuery({
    queryKey: ["patient-intake", intakeId],
    queryFn: () => fetchPatientIntake(intakeId),
  });
  if (query.isLoading)
    return <p className="text-sm text-muted-foreground">Loading patient intake record...</p>;
  if (query.isError || !query.data)
    return (
      <p className="text-sm text-alert">
        {(query.error as Error | null)?.message ?? "Patient intake record not found."}
      </p>
    );
  const row = query.data;
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link
        to="/patient-intakes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-teal hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to patient intake
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy sm:text-2xl">
            {row.first_name} {row.last_name}
          </h1>
          <div className="mt-2">
            <Badge variant="outline">{row.status}</Badge>
          </div>
        </div>
        <Button asChild size="sm">
          <Link to="/patient-intakes/$intakeId/edit" params={{ intakeId }}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit intake
          </Link>
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal and contact details</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Date of birth" value={formatDate(row.date_of_birth)} />
            <Row label="Preferred name" value={row.preferred_name} />
            <Row label="Sex at birth" value={row.sex_at_birth} />
            <Row label="Pronouns" value={row.pronouns} />
            <Row label="Phone" value={row.phone} />
            <Row label="Email" value={row.email} />
            <Row
              label="Address"
              value={[row.address_line_1, row.address_line_2, row.suburb, row.state, row.postcode]
                .filter(Boolean)
                .join(", ")}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coverage and emergency contact</CardTitle>
          </CardHeader>
          <CardContent>
            <Row
              label="Medicare"
              value={[row.medicare_number, row.medicare_reference_number, row.medicare_expiry]
                .filter(Boolean)
                .join(" · ")}
            />
            <Row
              label="Private health"
              value={[row.private_health_fund, row.private_health_member_number]
                .filter(Boolean)
                .join(" · ")}
            />
            <Row
              label="Emergency contact"
              value={`${row.emergency_contact_name} (${row.emergency_contact_relationship})`}
            />
            <Row label="Emergency phone" value={row.emergency_contact_phone} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinical intake</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Reason for visit" value={row.reason_for_visit} />
            <Row label="Current symptoms" value={row.current_symptoms} />
            <Row label="Medical conditions" value={row.medical_conditions} />
            <Row label="Previous surgeries" value={row.past_surgeries} />
            <Row label="Current medications" value={row.current_medications} />
            <Row label="Allergies and reactions" value={row.allergies} />
            <Row label="Relevant family history" value={row.family_history} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Care, consent and review</CardTitle>
          </CardHeader>
          <CardContent>
            <Row
              label="Regular GP"
              value={[row.regular_gp_name, row.regular_gp_practice].filter(Boolean).join(" · ")}
            />
            <Row label="Specialists" value={row.specialists} />
            <Row label="Smoking status" value={row.smoking_status} />
            <Row label="Alcohol use" value={row.alcohol_use} />
            <Row label="Accessibility requirements" value={row.accessibility_requirements} />
            <Row label="Interpreter language" value={row.interpreter_language} />
            <Row
              label="Privacy consent"
              value={row.privacy_consent ? "Recorded" : "Not recorded"}
            />
            <Row
              label="Treatment consent"
              value={row.treatment_consent ? "Recorded" : "Not recorded"}
            />
            <Row label="Internal staff notes" value={row.internal_notes} />
            <Row label="Created" value={formatDateTime(row.created_at)} />
            <Row label="Last updated" value={formatDateTime(row.updated_at)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
