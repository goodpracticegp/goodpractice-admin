import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_PATIENT_INTAKE,
  PATIENT_INTAKE_STATUSES,
  patientIntakeSchema,
  type PatientIntakeValues,
} from "@/lib/patient-intakes";

type Props = {
  initialValues?: PatientIntakeValues;
  submitting: boolean;
  onSubmit: (values: PatientIntakeValues) => void;
  onCancel: () => void;
};

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export function PatientIntakeForm({ initialValues, submitting, onSubmit, onCancel }: Props) {
  const form = useForm<PatientIntakeValues>({
    resolver: zodResolver(patientIntakeSchema),
    defaultValues: initialValues ?? EMPTY_PATIENT_INTAKE,
  });
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const field = (
    name: keyof PatientIntakeValues,
    label: string,
    options?: { type?: string; required?: boolean },
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {options?.required ? " *" : ""}
      </Label>
      <Input id={name} type={options?.type ?? "text"} {...register(name)} />
      {errors[name] && (
        <p className="text-xs text-alert">
          {String(errors[name]?.message ?? "Please check this field")}
        </p>
      )}
    </div>
  );

  const textArea = (name: keyof PatientIntakeValues, label: string, required = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Textarea id={name} rows={3} {...register(name)} />
      {errors[name] && (
        <p className="text-xs text-alert">
          {String(errors[name]?.message ?? "Please check this field")}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <p className="text-xs text-muted-foreground">
        Fields marked * are required. Record only information needed for patient care.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field("first_name", "First name", { required: true })}
          {field("last_name", "Last name", { required: true })}
          {field("preferred_name", "Preferred name")}
          {field("date_of_birth", "Date of birth", { type: "date", required: true })}
          <div className="space-y-1.5">
            <Label htmlFor="sex_at_birth">Sex at birth</Label>
            <select
              id="sex_at_birth"
              {...register("sex_at_birth")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select</option>
              <option>Female</option>
              <option>Male</option>
              <option>Intersex</option>
              <option>Prefer not to say</option>
            </select>
          </div>
          {field("pronouns", "Pronouns")}
          {field("phone", "Phone", { type: "tel", required: true })}
          {field("email", "Email", { type: "email" })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address and coverage</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2">
            {field("address_line_1", "Address line 1", { required: true })}
          </div>
          {field("address_line_2", "Address line 2")}
          {field("suburb", "Suburb", { required: true })}
          <div className="space-y-1.5">
            <Label htmlFor="state">State *</Label>
            <select
              id="state"
              {...register("state")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {AU_STATES.map((state) => (
                <option key={state}>{state}</option>
              ))}
            </select>
          </div>
          {field("postcode", "Postcode", { required: true })}
          {field("medicare_number", "Medicare number")}
          {field("medicare_reference_number", "Medicare reference number")}
          {field("medicare_expiry", "Medicare expiry (MM/YYYY)")}
          {field("private_health_fund", "Private health fund")}
          {field("private_health_member_number", "Member number")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emergency contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {field("emergency_contact_name", "Contact name", { required: true })}
          {field("emergency_contact_relationship", "Relationship", { required: true })}
          {field("emergency_contact_phone", "Contact phone", { type: "tel", required: true })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Health information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {textArea("reason_for_visit", "Reason for visit", true)}
          {textArea("current_symptoms", "Current symptoms")}
          {textArea("medical_conditions", "Medical conditions")}
          {textArea("past_surgeries", "Previous surgeries")}
          {textArea("current_medications", "Current medications")}
          {textArea("allergies", "Allergies and reactions")}
          {textArea("family_history", "Relevant family history")}
          {textArea("specialists", "Current specialists")}
          {field("regular_gp_name", "Regular GP name")}
          {field("regular_gp_practice", "Regular GP practice")}
          <div className="space-y-1.5">
            <Label htmlFor="smoking_status">Smoking status</Label>
            <select
              id="smoking_status"
              {...register("smoking_status")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select</option>
              <option>Never</option>
              <option>Former</option>
              <option>Current</option>
              <option>Prefer not to say</option>
            </select>
          </div>
          {field("alcohol_use", "Alcohol use")}
          {textArea("accessibility_requirements", "Accessibility requirements")}
          {field("interpreter_language", "Interpreter language")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consent and staff review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={watch("privacy_consent")}
              onCheckedChange={(checked) => setValue("privacy_consent", checked === true)}
            />
            <span>
              The patient has received the privacy information and consents to the collection and
              handling of their health information.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={watch("treatment_consent")}
              onCheckedChange={(checked) => setValue("treatment_consent", checked === true)}
            />
            <span>
              The patient consents to assessment and treatment by Good Practice GP Surgery.
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="status">Review status</Label>
              <select
                id="status"
                {...register("status")}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {PATIENT_INTAKE_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
            {textArea("internal_notes", "Internal staff notes")}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-16 z-30 -mx-4 flex justify-end gap-2 border-t border-border bg-background/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save patient intake"}
        </Button>
      </div>
    </form>
  );
}
