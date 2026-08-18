import { describe, expect, it } from "vitest";
import { EMPTY_STAFF_ONBOARDING, staffOnboardingSchema } from "./staff-onboarding";

const validDraft = {
  ...EMPTY_STAFF_ONBOARDING,
  first_name: "Alex", last_name: "Morgan", date_of_birth: "1990-01-01",
  personal_email: "alex@example.com", mobile: "0400000000", address_line_1: "1 George Street",
  suburb: "Sydney", state: "NSW", postcode: "2000", job_title: "Practice Nurse", department: "Clinical",
  employment_type: "Full-time" as const, start_date: "2026-09-01", emergency_contact_name: "Sam Morgan",
  emergency_contact_relationship: "Partner", emergency_contact_phone: "0400000001",
};

describe("staff onboarding validation", () => {
  it("accepts a valid draft", () => expect(staffOnboardingSchema.safeParse(validDraft).success).toBe(true));
  it("rejects a future date of birth", () => expect(staffOnboardingSchema.safeParse({ ...validDraft, date_of_birth: "2999-01-01" }).success).toBe(false));
  it("requires an employment type", () => expect(staffOnboardingSchema.safeParse({ ...validDraft, employment_type: "" }).success).toBe(false));
  it("prevents premature completion", () => expect(staffOnboardingSchema.safeParse({ ...validDraft, status: "Completed" }).success).toBe(false));
  it("allows completion after mandatory checks", () => expect(staffOnboardingSchema.safeParse({ ...validDraft, status: "Completed", tfn_declaration_status: "Provided to payroll", bank_details_status: "Provided securely to payroll", super_details_status: "Provided to payroll", right_to_work_verified: true, privacy_acknowledged: true, confidentiality_acknowledged: true, whs_acknowledged: true, code_of_conduct_acknowledged: true }).success).toBe(true));
});
