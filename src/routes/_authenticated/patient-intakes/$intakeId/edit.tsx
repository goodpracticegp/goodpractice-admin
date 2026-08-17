import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PatientIntakeForm } from "@/components/PatientIntakeForm";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPatientIntake,
  patientIntakeToValues,
  toPatientIntakeRow,
  type PatientIntakeValues,
} from "@/lib/patient-intakes";

export const Route = createFileRoute("/_authenticated/patient-intakes/$intakeId/edit")({
  head: () => ({ meta: [{ title: "Edit Patient Intake | Good Practice GP Surgery" }] }),
  component: EditPatientIntakePage,
});

function EditPatientIntakePage() {
  const { intakeId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["patient-intake", intakeId],
    queryFn: () => fetchPatientIntake(intakeId),
  });
  const mutation = useMutation({
    mutationFn: async (values: PatientIntakeValues) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Your session has expired. Please sign in again.");
      const row = toPatientIntakeRow(values, auth.user.id);
      const { created_by: _createdBy, ...update } = row;
      const { error } = await supabase.from("patient_intakes").update(update).eq("id", intakeId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["patient-intakes"] });
      void queryClient.invalidateQueries({ queryKey: ["patient-intake", intakeId] });
      toast.success("Patient intake updated securely");
      void navigate({ to: "/patient-intakes/$intakeId", params: { intakeId } });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  if (query.isLoading)
    return <p className="text-sm text-muted-foreground">Loading patient intake record...</p>;
  if (!query.data) return <p className="text-sm text-alert">Patient intake record not found.</p>;
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-navy sm:text-2xl">Edit patient intake</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Changes are recorded in the audit trail.
        </p>
      </div>
      <PatientIntakeForm
        initialValues={patientIntakeToValues(query.data)}
        submitting={mutation.isPending}
        onSubmit={(values) => mutation.mutate(values)}
        onCancel={() => void navigate({ to: "/patient-intakes/$intakeId", params: { intakeId } })}
      />
    </div>
  );
}
