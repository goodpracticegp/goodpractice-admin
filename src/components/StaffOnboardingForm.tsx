import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_STAFF_ONBOARDING,
  STAFF_ONBOARDING_STATUSES,
  staffOnboardingSchema,
  type StaffOnboardingValues,
} from "@/lib/staff-onboarding";

type Props = {
  initialValues?: StaffOnboardingValues;
  submitting: boolean;
  onSubmit: (values: StaffOnboardingValues) => void;
  onCancel: () => void;
};

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export function StaffOnboardingForm({ initialValues, submitting, onSubmit, onCancel }: Props) {
  const form = useForm<StaffOnboardingValues>({
    resolver: zodResolver(staffOnboardingSchema),
    defaultValues: initialValues ?? EMPTY_STAFF_ONBOARDING,
  });
  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  const field = (name: keyof StaffOnboardingValues, label: string, options?: { type?: string; required?: boolean }) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}{options?.required ? " *" : ""}</Label>
      <Input id={name} type={options?.type ?? "text"} {...register(name)} />
      {errors[name] && <p className="text-xs text-alert">{String(errors[name]?.message ?? "Please check this field")}</p>}
    </div>
  );

  const select = (name: keyof StaffOnboardingValues, label: string, values: readonly string[], required = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}{required ? " *" : ""}</Label>
      <select id={name} {...register(name)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
        {values.map((value) => <option key={value} value={value}>{value || "Select"}</option>)}
      </select>
      {errors[name] && <p className="text-xs text-alert">{String(errors[name]?.message ?? "Please check this field")}</p>}
    </div>
  );

  const check = (name: keyof StaffOnboardingValues, label: string) => (
    <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
      <Checkbox
        checked={Boolean(watch(name))}
        onCheckedChange={(checked) => setValue(name, Boolean(checked), { shouldValidate: true })}
      />
      <span>{label}</span>
    </label>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="flex gap-3 rounded-lg border border-teal/25 bg-teal-soft p-4 text-sm">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
        <p>
          Do not enter a full Tax File Number or bank account number here. Record only the handover status. TFN and banking details must be transferred securely to authorised payroll staff.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Onboarding status</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {select("status", "Status", STAFF_ONBOARDING_STATUSES, true)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Employee details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {select("title", "Title", ["", "Mr", "Mrs", "Ms", "Miss", "Dr"])}
          {field("first_name", "First name", { required: true })}
          {field("last_name", "Surname", { required: true })}
          {field("preferred_name", "Preferred name")}
          {field("date_of_birth", "Date of birth", { type: "date", required: true })}
          {field("personal_email", "Personal email", { type: "email", required: true })}
          {field("mobile", "Mobile", { type: "tel", required: true })}
          <div className="sm:col-span-2">{field("address_line_1", "Home address", { required: true })}</div>
          {field("address_line_2", "Address line 2")}
          {field("suburb", "Suburb", { required: true })}
          {select("state", "State", AU_STATES, true)}
          {field("postcode", "Postcode", { required: true })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Employment details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field("job_title", "Job title", { required: true })}
          {field("department", "Department", { required: true })}
          {select("employment_type", "Employment type", ["", "Full-time", "Part-time", "Casual", "Fixed-term", "Contractor"], true)}
          {field("start_date", "Start date", { type: "date", required: true })}
          {field("manager_name", "Manager")}
          {field("work_location", "Work location")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Emergency contact</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {field("emergency_contact_name", "Contact name", { required: true })}
          {field("emergency_contact_relationship", "Relationship", { required: true })}
          {field("emergency_contact_phone", "Contact phone", { type: "tel", required: true })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tax and payroll handover</CardTitle>
          <p className="text-sm text-muted-foreground">Based on the ATO Tax File Number Declaration. The full TFN is intentionally not collected in this screen.</p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {select("tax_residency", "Tax residency", ["", "Australian resident", "Foreign resident", "Working holiday maker"])}
          {select("tfn_declaration_status", "TFN declaration", ["Not started", "Provided to payroll", "Lodged with ATO"], true)}
          {field("tfn_declaration_received_at", "Declaration received", { type: "date" })}
          {select("bank_details_status", "Bank details", ["Not provided", "Provided securely to payroll", "Verified by payroll"], true)}
          {select("super_details_status", "Superannuation details", ["Not provided", "Provided to payroll", "Verified by payroll"], true)}
          <div className="space-y-3 sm:col-span-2 lg:col-span-3">
            {check("claim_tax_free_threshold", "Employee claims the tax-free threshold from this payer")}
            {check("has_help_debt", "Employee has a HELP, VSL, FS, SSL or AASL debt")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Employment and healthcare checks</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {check("right_to_work_verified", "Australian right to work verified")}
          {check("qualifications_verified", "Qualifications and licences verified")}
          {select("police_check_status", "Police check", ["Not required", "Pending", "Verified"])}
          {select("wwcc_status", "Working with Children Check", ["Not required", "Pending", "Verified"])}
          {field("ahpra_registration_number", "AHPRA registration number")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Policies and acknowledgements</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {check("privacy_acknowledged", "Privacy and information handling requirements acknowledged")}
          {check("confidentiality_acknowledged", "Confidentiality agreement acknowledged")}
          {check("whs_acknowledged", "Work health and safety induction acknowledged")}
          {check("code_of_conduct_acknowledged", "Code of conduct acknowledged")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Internal notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={4} {...register("internal_notes")} placeholder="Do not record TFNs, bank account numbers or unnecessary health information." />
        </CardContent>
      </Card>

      <div className="sticky bottom-16 z-20 flex justify-end gap-2 border-t bg-background/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save staff onboarding"}</Button>
      </div>
    </form>
  );
}
