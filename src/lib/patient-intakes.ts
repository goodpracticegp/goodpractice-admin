import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const PATIENT_INTAKE_STATUSES = [
  "Draft",
  "Submitted",
  "Under Review",
  "Needs Information",
  "Reviewed",
  "Archived",
] as const;

const optionalText = z.string().trim().max(4000).optional().default("");

export const patientIntakeSchema = z
  .object({
    status: z.enum(PATIENT_INTAKE_STATUSES),
    first_name: z.string().trim().min(1, "First name is required").max(100),
    last_name: z.string().trim().min(1, "Last name is required").max(100),
    preferred_name: z.string().trim().max(100).optional().default(""),
    date_of_birth: z
      .string()
      .min(1, "Date of birth is required")
      .refine(
        (value) => value <= new Date().toISOString().slice(0, 10),
        "Date of birth cannot be in the future",
      ),
    sex_at_birth: z.enum(["", "Female", "Male", "Intersex", "Prefer not to say"]),
    pronouns: z.string().trim().max(100).optional().default(""),
    phone: z.string().trim().min(6, "Phone number is required").max(30),
    email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address")]),
    address_line_1: z.string().trim().min(1, "Address is required").max(200),
    address_line_2: z.string().trim().max(200).optional().default(""),
    suburb: z.string().trim().min(1, "Suburb is required").max(100),
    state: z.string().trim().min(1, "State is required").max(20),
    postcode: z.string().regex(/^\d{4}$/, "Enter a four-digit postcode"),
    medicare_number: z.string().trim().max(20).optional().default(""),
    medicare_reference_number: z.string().trim().max(5).optional().default(""),
    medicare_expiry: z.string().trim().max(10).optional().default(""),
    private_health_fund: z.string().trim().max(100).optional().default(""),
    private_health_member_number: z.string().trim().max(100).optional().default(""),
    emergency_contact_name: z.string().trim().min(1, "Emergency contact name is required").max(200),
    emergency_contact_relationship: z.string().trim().min(1, "Relationship is required").max(100),
    emergency_contact_phone: z
      .string()
      .trim()
      .min(6, "Emergency contact phone is required")
      .max(30),
    reason_for_visit: z.string().trim().min(1, "Reason for visit is required").max(4000),
    current_symptoms: optionalText,
    medical_conditions: optionalText,
    past_surgeries: optionalText,
    current_medications: optionalText,
    allergies: optionalText,
    family_history: optionalText,
    regular_gp_name: z.string().trim().max(200).optional().default(""),
    regular_gp_practice: z.string().trim().max(200).optional().default(""),
    specialists: optionalText,
    smoking_status: z.enum(["", "Never", "Former", "Current", "Prefer not to say"]),
    alcohol_use: z.string().trim().max(500).optional().default(""),
    accessibility_requirements: optionalText,
    interpreter_language: z.string().trim().max(100).optional().default(""),
    privacy_consent: z.boolean(),
    treatment_consent: z.boolean(),
    internal_notes: optionalText,
  })
  .superRefine((values, context) => {
    if (values.status !== "Draft" && (!values.privacy_consent || !values.treatment_consent)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["privacy_consent"],
        message:
          "Privacy and treatment consent must be recorded before this intake leaves Draft status",
      });
    }
  });

export type PatientIntakeValues = z.infer<typeof patientIntakeSchema>;
export type PatientIntake = PatientIntakeValues & {
  id: string;
  created_at: string;
  updated_at: string;
};

export const EMPTY_PATIENT_INTAKE: PatientIntakeValues = {
  status: "Draft",
  first_name: "",
  last_name: "",
  preferred_name: "",
  date_of_birth: "",
  sex_at_birth: "",
  pronouns: "",
  phone: "",
  email: "",
  address_line_1: "",
  address_line_2: "",
  suburb: "",
  state: "NSW",
  postcode: "",
  medicare_number: "",
  medicare_reference_number: "",
  medicare_expiry: "",
  private_health_fund: "",
  private_health_member_number: "",
  emergency_contact_name: "",
  emergency_contact_relationship: "",
  emergency_contact_phone: "",
  reason_for_visit: "",
  current_symptoms: "",
  medical_conditions: "",
  past_surgeries: "",
  current_medications: "",
  allergies: "",
  family_history: "",
  regular_gp_name: "",
  regular_gp_practice: "",
  specialists: "",
  smoking_status: "",
  alcohol_use: "",
  accessibility_requirements: "",
  interpreter_language: "",
  privacy_consent: false,
  treatment_consent: false,
  internal_notes: "",
};

function nullable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function toPatientIntakeRow(values: PatientIntakeValues, userId: string) {
  return {
    ...values,
    email: nullable(values.email),
    preferred_name: nullable(values.preferred_name),
    sex_at_birth: nullable(values.sex_at_birth),
    pronouns: nullable(values.pronouns),
    address_line_2: nullable(values.address_line_2),
    medicare_number: nullable(values.medicare_number),
    medicare_reference_number: nullable(values.medicare_reference_number),
    medicare_expiry: nullable(values.medicare_expiry),
    private_health_fund: nullable(values.private_health_fund),
    private_health_member_number: nullable(values.private_health_member_number),
    current_symptoms: nullable(values.current_symptoms),
    medical_conditions: nullable(values.medical_conditions),
    past_surgeries: nullable(values.past_surgeries),
    current_medications: nullable(values.current_medications),
    allergies: nullable(values.allergies),
    family_history: nullable(values.family_history),
    regular_gp_name: nullable(values.regular_gp_name),
    regular_gp_practice: nullable(values.regular_gp_practice),
    specialists: nullable(values.specialists),
    smoking_status: nullable(values.smoking_status),
    alcohol_use: nullable(values.alcohol_use),
    accessibility_requirements: nullable(values.accessibility_requirements),
    interpreter_language: nullable(values.interpreter_language),
    internal_notes: nullable(values.internal_notes),
    created_by: userId,
    updated_by: userId,
  };
}

export async function fetchPatientIntakes(): Promise<PatientIntake[]> {
  const { data, error } = await supabase
    .from("patient_intakes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PatientIntake[];
}

export async function fetchPatientIntake(id: string): Promise<PatientIntake> {
  const { data, error } = await supabase.from("patient_intakes").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data as unknown as PatientIntake;
}

export function patientIntakeToValues(record: PatientIntake): PatientIntakeValues {
  const values = { ...EMPTY_PATIENT_INTAKE, ...record } as Record<string, unknown>;
  for (const key of Object.keys(EMPTY_PATIENT_INTAKE)) {
    if (values[key] === null) values[key] = "";
  }
  return values as PatientIntakeValues;
}
