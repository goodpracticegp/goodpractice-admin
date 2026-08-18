import { describe, expect, it } from "vitest";
import { EMPTY_PATIENT_INTAKE, patientIntakeSchema } from "./patient-intakes";

const valid = {
  ...EMPTY_PATIENT_INTAKE,
  first_name: "Asha",
  last_name: "Perera",
  date_of_birth: "1990-04-12",
  phone: "0412 345 678",
  email: "asha@example.com",
  address_line_1: "10 Sample Street",
  suburb: "Sydney",
  postcode: "2000",
  emergency_contact_name: "Nimal Perera",
  emergency_contact_relationship: "Partner",
  emergency_contact_phone: "0400 111 222",
  reason_for_visit: "New patient appointment",
};

describe("patient intake validation", () => {
  it("accepts a valid staff-entered intake", () => {
    expect(patientIntakeSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a future date of birth", () => {
    const result = patientIntakeSchema.safeParse({ ...valid, date_of_birth: "2999-01-01" });
    expect(result.success).toBe(false);
  });

  it("requires a four-digit Australian postcode", () => {
    const result = patientIntakeSchema.safeParse({ ...valid, postcode: "20A0" });
    expect(result.success).toBe(false);
  });

  it("does not require consent while the record remains a draft", () => {
    const result = patientIntakeSchema.safeParse({
      ...valid,
      status: "Draft",
      privacy_consent: false,
      treatment_consent: false,
    });
    expect(result.success).toBe(true);
  });

  it("requires both consents before an intake leaves draft", () => {
    const result = patientIntakeSchema.safeParse({
      ...valid,
      status: "Submitted",
      privacy_consent: true,
      treatment_consent: false,
    });
    expect(result.success).toBe(false);
  });
});
