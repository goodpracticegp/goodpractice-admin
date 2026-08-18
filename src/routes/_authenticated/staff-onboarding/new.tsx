import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StaffOnboardingForm } from "@/components/StaffOnboardingForm";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toStaffOnboardingRow, type StaffOnboardingValues } from "@/lib/staff-onboarding";

export const Route = createFileRoute("/_authenticated/staff-onboarding/new")({
  head: () => ({ meta: [{ title: "New Staff Onboarding | Good Practice GP Surgery" }] }),
  component: NewStaffOnboardingPage,
});

function NewStaffOnboardingPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (values: StaffOnboardingValues) => {
      if (!isAdmin) throw new Error("Administrator access is required.");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Your session has expired. Please sign in again.");
      const { error } = await (supabase as any).from("staff_onboardings").insert(toStaffOnboardingRow(values, auth.user.id));
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["staff-onboardings"] });
      toast.success("Staff onboarding saved securely");
      void navigate({ to: "/staff-onboarding" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!isAdmin) return <p className="text-sm text-alert">Administrator access is required.</p>;
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div><h1 className="text-xl font-bold text-navy sm:text-2xl">New staff onboarding</h1><p className="mt-1 text-sm text-muted-foreground">Collect employment and compliance details, then securely hand payroll information to authorised staff.</p></div>
      <StaffOnboardingForm submitting={mutation.isPending} onSubmit={(values) => mutation.mutate(values)} onCancel={() => void navigate({ to: "/staff-onboarding" })} />
    </div>
  );
}
