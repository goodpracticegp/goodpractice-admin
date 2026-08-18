-- Administrator-only staff onboarding records.
-- Deliberately excludes full TFNs and bank account numbers. Those values must be
-- handled only by authorised payroll staff through an approved payroll process.

CREATE TYPE public.staff_onboarding_status AS ENUM (
  'Draft',
  'Awaiting Documents',
  'Ready for Review',
  'Completed',
  'Archived'
);

CREATE TABLE public.staff_onboardings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status public.staff_onboarding_status NOT NULL DEFAULT 'Draft',
  title text,
  first_name text NOT NULL CHECK (char_length(btrim(first_name)) BETWEEN 1 AND 100),
  last_name text NOT NULL CHECK (char_length(btrim(last_name)) BETWEEN 1 AND 100),
  preferred_name text,
  date_of_birth date NOT NULL CHECK (date_of_birth <= current_date),
  personal_email text NOT NULL CHECK (personal_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  mobile text NOT NULL CHECK (char_length(btrim(mobile)) BETWEEN 6 AND 30),
  address_line_1 text NOT NULL,
  address_line_2 text,
  suburb text NOT NULL,
  state text NOT NULL DEFAULT 'NSW',
  postcode text NOT NULL CHECK (postcode ~ '^\d{4}$'),
  job_title text NOT NULL,
  department text NOT NULL,
  employment_type text NOT NULL CHECK (employment_type IN ('Full-time', 'Part-time', 'Casual', 'Fixed-term', 'Contractor')),
  start_date date NOT NULL,
  manager_name text,
  work_location text,
  emergency_contact_name text NOT NULL,
  emergency_contact_relationship text NOT NULL,
  emergency_contact_phone text NOT NULL,
  tax_residency text CHECK (tax_residency IS NULL OR tax_residency IN ('Australian resident', 'Foreign resident', 'Working holiday maker')),
  claim_tax_free_threshold boolean,
  has_help_debt boolean,
  tfn_declaration_status text NOT NULL DEFAULT 'Not started' CHECK (tfn_declaration_status IN ('Not started', 'Provided to payroll', 'Lodged with ATO')),
  tfn_declaration_received_at date,
  bank_details_status text NOT NULL DEFAULT 'Not provided' CHECK (bank_details_status IN ('Not provided', 'Provided securely to payroll', 'Verified by payroll')),
  super_details_status text NOT NULL DEFAULT 'Not provided' CHECK (super_details_status IN ('Not provided', 'Provided to payroll', 'Verified by payroll')),
  right_to_work_verified boolean NOT NULL DEFAULT false,
  qualifications_verified boolean NOT NULL DEFAULT false,
  police_check_status text NOT NULL DEFAULT 'Not required' CHECK (police_check_status IN ('Not required', 'Pending', 'Verified')),
  wwcc_status text NOT NULL DEFAULT 'Not required' CHECK (wwcc_status IN ('Not required', 'Pending', 'Verified')),
  ahpra_registration_number text,
  privacy_acknowledged boolean NOT NULL DEFAULT false,
  confidentiality_acknowledged boolean NOT NULL DEFAULT false,
  whs_acknowledged boolean NOT NULL DEFAULT false,
  code_of_conduct_acknowledged boolean NOT NULL DEFAULT false,
  internal_notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT completed_staff_onboarding_check CHECK (
    status <> 'Completed' OR (
      tfn_declaration_status IN ('Provided to payroll', 'Lodged with ATO')
      AND bank_details_status <> 'Not provided'
      AND super_details_status <> 'Not provided'
      AND right_to_work_verified
      AND privacy_acknowledged
      AND confidentiality_acknowledged
      AND whs_acknowledged
      AND code_of_conduct_acknowledged
    )
  )
);

CREATE INDEX staff_onboardings_name_idx ON public.staff_onboardings (lower(last_name), lower(first_name));
CREATE INDEX staff_onboardings_status_idx ON public.staff_onboardings (status);
CREATE INDEX staff_onboardings_start_date_idx ON public.staff_onboardings (start_date);

ALTER TABLE public.staff_onboardings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.staff_onboardings TO authenticated;
GRANT ALL ON public.staff_onboardings TO service_role;
REVOKE DELETE ON public.staff_onboardings FROM authenticated;

CREATE POLICY staff_onboardings_select_admin ON public.staff_onboardings
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY staff_onboardings_insert_admin ON public.staff_onboardings
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin() AND created_by = auth.uid() AND updated_by = auth.uid()
  );
CREATE POLICY staff_onboardings_update_admin ON public.staff_onboardings
  FOR UPDATE TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin() AND updated_by = auth.uid());

CREATE OR REPLACE FUNCTION public.staff_onboardings_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.first_name := btrim(NEW.first_name);
  NEW.last_name := btrim(NEW.last_name);
  NEW.personal_email := lower(btrim(NEW.personal_email));
  NEW.mobile := btrim(NEW.mobile);
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  IF TG_OP = 'INSERT' THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_staff_onboardings_before_write
  BEFORE INSERT OR UPDATE ON public.staff_onboardings
  FOR EACH ROW EXECUTE FUNCTION public.staff_onboardings_before_write();

CREATE OR REPLACE FUNCTION public.audit_staff_onboarding_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.write_audit(
    CASE WHEN TG_OP = 'INSERT' THEN 'Create' WHEN NEW.status IS DISTINCT FROM OLD.status THEN 'Status Change' ELSE 'Edit' END,
    'staff_onboardings',
    NEW.id::text,
    jsonb_build_object('status', NEW.status, 'employee', NEW.first_name || ' ' || NEW.last_name)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_staff_onboardings_audit
  AFTER INSERT OR UPDATE ON public.staff_onboardings
  FOR EACH ROW EXECUTE FUNCTION public.audit_staff_onboarding_change();

REVOKE ALL ON FUNCTION public.staff_onboardings_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_staff_onboarding_change() FROM PUBLIC, anon, authenticated;
