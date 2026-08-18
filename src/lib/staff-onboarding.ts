import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const STAFF_ONBOARDING_STATUSES = [
  "Draft",
  "Awaiting Documents",
  "Ready for Review",
  "Completed",
  "Archived",
] as const;

const optionalText = z.string().trim().max(4000).optional().default("");

export const staffOnboardingSchema = z
  .object({
    status: z.enum(STAFF_ONBOARDING_STATUSES),
    title: z.string().trim().max(20).optional().default(""),
    first_name: z.string().trim().min(1, "First name is required").max(100),
    last_name: z.string().trim().min(1, "Last name is required").max(100),
    preferred_name: z.string().trim().max(100).optional().default(""),
    date_of_birth: z.string().min(1, "Date of birth is required").refine(
      (value) => value <= new Date().toISOString().slice(0, 10),
      "Date of birth cannot be in the future",
    ),
    personal_email: z.string().trim().email("Enter a valid email address"),
    mobile: z.string().trim().min(6, "Mobile number is required").max(30),
    address_line_1: z.string().trim().min(1, "Address is required").max(200),
    address_line_2: z.string().trim().max(200).optional().default(""),
    suburb: z.string().trim().min(1, "Suburb is required").max(100),
    state: z.string().trim().min(1, "State is required").max(20),
    postcode: z.string().regex(/^\d{4}$/, "Enter a four-digit postcode"),
    job_title: z.string().trim().min(1, "Job title is required").max(150),
    department: z.string().trim().min(1, "Department is required").max(150),
    employment_type: z.enum(["", "Full-time", "Part-time", "Casual", "Fixed-term", "Contractor"]),
    start_date: z.string().min(1, "Start date is required"),
    manager_name: z.string().trim().max(200).optional().default(""),
    work_location: z.string().trim().max(200).optional().default(""),
    emergency_contact_name: z.string().trim().min(1, "Emergency contact is required").max(200),
    emergency_contact_relationship: z.string().trim().min(1, "Relationship is required").max(100),
    emergency_contact_phone: z.string().trim().min(6, "Contact phone is required").max(30),
    tax_residency: z.enum(["", "Australian resident", "Foreign resident", "Working holiday maker"]),
    claim_tax_free_threshold: z.boolean(),
    has_help_debt: z.boolean(),
    tfn_declaration_status: z.enum(["Not started", "Provided to payroll", "Lodged with ATO"]),
    tfn_declaration_received_at: z.string().optional().default(""),
    bank_details_status: z.enum(["Not provided", "Provided securely to payroll", "Verified by payroll"]),
    super_details_status: z.enum(["Not provided", "Provided to payroll", "Verified by payroll"]),
    right_to_work_verified: z.boolean(),
    qualifications_verified: z.boolean(),
    police_check_status: z.enum(["Not required", "Pending", "Verified"]),
    wwcc_status: z.enum(["Not required", "Pending", "Verified"]),
    ahpra_registration_number: z.string().trim().max(100).optional().default(""),
    privacy_acknowledged: z.boolean(),
    confidentiality_acknowledged: z.boolean(),
    whs_acknowledged: z.boolean(),
    code_of_conduct_acknowledged: z.boolean(),
    internal_notes: optionalText,
  })
  .superRefine((values, context) => {
    if (!values.employment_type) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["employment_type"], message: "Employment type is required" });
    }
    if (values.status === "Completed") {
      const incomplete =
        values.tfn_declaration_status === "Not started" ||
        values.bank_details_status === "Not provided" ||
        values.super_details_status === "Not provided" ||
        !values.right_to_work_verified ||
        !values.privacy_acknowledged ||
        !values.confidentiality_acknowledged ||
        !values.whs_acknowledged ||
        !values.code_of_conduct_acknowledged;
      if (incomplete) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["status"],
          message: "Complete payroll handover, right-to-work verification and all acknowledgements first",
        });
      }
    }
  });

export type StaffOnboardingValues = z.infer<typeof staffOnboardingSchema>;
export type StaffOnboarding = StaffOnboardingValues & { id: string; created_at: string; updated_at: string };

export const EMPTY_STAFF_ONBOARDING: StaffOnboardingValues = {
  status: "Draft", title: "", first_name: "", last_name: "", preferred_name: "", date_of_birth: "",
  personal_email: "", mobile: "", address_line_1: "", address_line_2: "", suburb: "", state: "NSW", postcode: "",
  job_title: "", department: "", employment_type: "", start_date: "", manager_name: "", work_location: "",
  emergency_contact_name: "", emergency_contact_relationship: "", emergency_contact_phone: "", tax_residency: "",
  claim_tax_free_threshold: false, has_help_debt: false, tfn_declaration_status: "Not started",
  tfn_declaration_received_at: "", bank_details_status: "Not provided", super_details_status: "Not provided",
  right_to_work_verified: false, qualifications_verified: false, police_check_status: "Not required", wwcc_status: "Not required",
  ahpra_registration_number: "", privacy_acknowledged: false, confidentiality_acknowledged: false,
  whs_acknowledged: false, code_of_conduct_acknowledged: false, internal_notes: "",
};

const nullable = (value: string | undefined) => value?.trim() || null;

export function toStaffOnboardingRow(values: StaffOnboardingValues, userId: string) {
  return {
    ...values,
    title: nullable(values.title), preferred_name: nullable(values.preferred_name), address_line_2: nullable(values.address_line_2),
    manager_name: nullable(values.manager_name), work_location: nullable(values.work_location), tax_residency: nullable(values.tax_residency),
    tfn_declaration_received_at: nullable(values.tfn_declaration_received_at),
    ahpra_registration_number: nullable(values.ahpra_registration_number), internal_notes: nullable(values.internal_notes),
    created_by: userId, updated_by: userId,
  };
}

export async function fetchStaffOnboardings(): Promise<StaffOnboarding[]> {
  const { data, error } = await (supabase as any).from("staff_onboardings").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as StaffOnboarding[];
}
