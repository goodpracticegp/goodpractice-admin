# Staff onboarding security

The Staff Onboarding module is restricted to administrators by navigation, application checks and Supabase Row Level Security.

## Information intentionally excluded

- Full Tax File Numbers
- Bank account and BSB numbers
- Scans of identity documents
- Unnecessary health information

The module records only whether TFN, banking and superannuation details were securely handed to authorised payroll staff. Those values must use an approved payroll workflow and must not be entered in free-text notes.

## Controls

- Every insert and update is attributable to an authenticated administrator.
- Database audit triggers record changes.
- Completed status requires payroll handover, right-to-work verification and policy acknowledgements.
- Authenticated users cannot delete records through the application policy.
- Retention and secure disposal must follow the practice retention schedule and applicable Australian employment and privacy requirements.
