CREATE TABLE public.source_export (
  part int PRIMARY KEY,
  data text NOT NULL,
  total_parts int NOT NULL,
  file_md5 text NOT NULL,
  file_bytes bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.source_export TO service_role;
ALTER TABLE public.source_export ENABLE ROW LEVEL SECURITY;
CREATE POLICY "source_export_admin_select" ON public.source_export FOR SELECT TO authenticated USING (public.is_admin());