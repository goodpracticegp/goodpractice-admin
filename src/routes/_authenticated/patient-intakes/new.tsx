import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PatientIntakeForm } from "@/components/PatientIntakeForm";
import { supabase } from "@/integrations/supabase/client";
import { toPatientIntakeRow, type PatientIntakeValues } from "@/lib/patient-intakes";

export const Route = createFileRoute("/_authenticated/patient-intakes/new")({
  head: () => ({ meta: [{ title: "New Patient Intake | Good Practice GP Surgery" }] }),
  component: NewPatientIntakePage,
});

function NewPatientIntakePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (values: PatientIntakeValues) => {
      const parsed = values;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Your session has expired. Please sign in again.");
      const { data, error } = await supabase
        .from("patient_intakes")
        .insert(toPatientIntakeRow(parsed, auth.user.id))
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["patient-intakes"] });
      toast.success("Patient intake saved securely");
      void navigate({ to: "/patient-intakes/$intakeId", params: { intakeId: data.id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-navy sm:text-2xl">New patient intake</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter information supplied by the patient. Do not leave this screen unattended.
        </p>
      </div>
      <PatientIntakeForm
        submitting={mutation.isPending}
        onSubmit={(values) => mutation.mutate(values)}
        onCancel={() => void navigate({ to: "/patient-intakes" })}
      />
    </div>
  );
}
