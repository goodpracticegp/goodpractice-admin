# Patient Intake Security and Privacy Review

## Scope

The first release is a staff-entered patient intake register inside the authenticated Good Practice GP administration system. It does not provide a public form or send health information by email.

## Controls

- Supabase row-level security restricts all reads and writes to authenticated users with the `staff` or `admin` role.
- Authenticated users cannot delete patient intake records.
- The database sets the creating and updating user identifiers from the authenticated session.
- Create, edit and status changes are written to the existing append-only audit trail.
- Audit records contain the record identifier, workflow status and consent completion only. They do not duplicate symptoms, conditions, medications, allergies, Medicare details or internal clinical notes.
- The interface does not offer CSV or Excel exports for patient health information.
- Validation limits text lengths and checks dates, postcodes and email format.

## Operational requirements before production

- Apply the migration in the correct Supabase production project and verify every row-level security policy with both staff and administrator test accounts.
- Confirm encryption in transit and at rest, backups, access logging, session timeout, staff access review and incident response procedures.
- Obtain a practice-approved privacy notice and consent wording before using the consent fields with real patients.
- Define retention and disposal rules with the practice's legal or privacy adviser under the Australian Privacy Act, the Australian Privacy Principles and applicable NSW health-record requirements.
- Do not enter real patient data into development, screenshots, source control, issue trackers or test fixtures.

## Deferred work

Public patient self-service, file uploads, digital signatures, clinical-system integration, secure patient messaging and automated retention are outside this release and require a separate privacy and threat review.
