-- Staff-entered patient intake records for Good Practice GP Surgery.
-- Health information is restricted to authenticated staff and administrators.

CREATE TYPE public.patient_intake_status AS ENUM (
  'Draft',
  'Submitted',
  'Under Review',
  'Needs Information',
  'Reviewed',
  'Archived'
);

CREATE TABLE public.patient_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status public.patient_intake_status NOT NULL DEFAULT 'Draft',
  first_name text NOT NULL CHECK (char_length(btrim(first_name)) BETWEEN 1 AND 100),
  last_name text NOT NULL CHECK (char_length(btrim(last_name)) BETWEEN 1 AND 100),
  date_of_birth date NOT NULL CHECK (date_of_birth <= current_date),
  sex_at_birth text CHECK (sex_at_birth IN ('Female', 'Male', 'Intersex', 'Prefer not to say')),
  preferred_name text,
  pronouns text,
  phone text NOT NULL CHECK (char_length(btrim(phone)) BETWEEN 6 AND 30),
  email text CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address_line_1 text NOT NULL,
  address_line_2 text,
  suburb text NOT NULL,
  state text NOT NULL DEFAULT 'NSW',
  postcode text NOT NULL CHECK (postcode ~ '^\d{4}$'),
  medicare_number text,
  medicare_reference_number text,
  medicare_expiry text,
  private_health_fund text,
  private_health_member_number text,
  emergency_contact_name text NOT NULL,
  emergency_contact_relationship text NOT NULL,
  emergency_contact_phone text NOT NULL,
  reason_for_visit text NOT NULL,
  current_symptoms text,
  medical_conditions text,
  past_surgeries text,
  current_medications text,
  allergies text,
  family_history text,
  regular_gp_name text,
  regular_gp_practice text,
  specialists text,
  smoking_status text CHECK (smoking_status IS NULL OR smoking_status IN ('Never', 'Former', 'Current', 'Prefer not to say')),
  alcohol_use text,
  accessibility_requirements text,
  interpreter_language text,
  privacy_consent boolean NOT NULL DEFAULT false,
  treatment_consent boolean NOT NULL DEFAULT false,
  consent_recorded_at timestamptz,
  consent_recorded_by uuid REFERENCES auth.users(id),
  internal_notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_intakes_submitted_consent_check CHECK (
    status = 'Draft' OR (privacy_consent AND treatment_consent)
  )
);

CREATE INDEX patient_intakes_name_idx ON public.patient_intakes (lower(last_name), lower(first_name));
CREATE INDEX patient_intakes_dob_idx ON public.patient_intakes (date_of_birth);
CREATE INDEX patient_intakes_status_idx ON public.patient_intakes (status);
CREATE INDEX patient_intakes_created_at_idx ON public.patient_intakes (created_at DESC);

ALTER TABLE public.patient_intakes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.patient_intakes TO authenticated;
GRANT ALL ON public.patient_intakes TO service_role;
REVOKE DELETE ON public.patient_intakes FROM authenticated;

CREATE POLICY patient_intakes_select_staff ON public.patient_intakes
  FOR SELECT TO authenticated USING (public.is_staff_or_admin());
CREATE POLICY patient_intakes_insert_staff ON public.patient_intakes
  FOR INSERT TO authenticated WITH CHECK (
    public.is_staff_or_admin()
    AND created_by = auth.uid()
    AND updated_by = auth.uid()
  );
CREATE POLICY patient_intakes_update_staff ON public.patient_intakes
  FOR UPDATE TO authenticated USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin() AND updated_by = auth.uid());

CREATE OR REPLACE FUNCTION public.patient_intakes_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.first_name := btrim(NEW.first_name);
  NEW.last_name := btrim(NEW.last_name);
  NEW.phone := btrim(NEW.phone);
  NEW.email := NULLIF(lower(btrim(COALESCE(NEW.email, ''))), '');
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
  END IF;

  IF NEW.privacy_consent AND NEW.treatment_consent AND NEW.consent_recorded_at IS NULL THEN
    NEW.consent_recorded_at := now();
    NEW.consent_recorded_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_patient_intakes_before_write
  BEFORE INSERT OR UPDATE ON public.patient_intakes
  FOR EACH ROW EXECUTE FUNCTION public.patient_intakes_before_write();

CREATE OR REPLACE FUNCTION public.audit_patient_intake_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit('Create', 'patient_intakes', NEW.id::text, jsonb_build_object(
      'status', NEW.status,
      'consent_complete', NEW.privacy_consent AND NEW.treatment_consent
    ));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.write_audit('Status Change', 'patient_intakes', NEW.id::text, jsonb_build_object(
      'status_before', OLD.status,
      'status_after', NEW.status
    ));
  ELSE
    PERFORM public.write_audit('Edit', 'patient_intakes', NEW.id::text, jsonb_build_object(
      'consent_complete', NEW.privacy_consent AND NEW.treatment_consent
    ));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_patient_intakes_audit
  AFTER INSERT OR UPDATE ON public.patient_intakes
  FOR EACH ROW EXECUTE FUNCTION public.audit_patient_intake_change();

REVOKE ALL ON FUNCTION public.patient_intakes_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_patient_intake_change() FROM PUBLIC, anon, authenticated;
