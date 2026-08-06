CREATE TABLE IF NOT EXISTS public.claude_export_chunks (
  path text NOT NULL,
  seq int NOT NULL,
  chunk text NOT NULL,
  PRIMARY KEY (path, seq)
);
CREATE TABLE IF NOT EXISTS public.claude_export_meta (
  path text PRIMARY KEY,
  sha256 text NOT NULL,
  byte_size int NOT NULL
);

GRANT SELECT ON public.claude_export_chunks TO authenticated;
GRANT SELECT ON public.claude_export_meta TO authenticated;
GRANT ALL ON public.claude_export_chunks TO service_role;
GRANT ALL ON public.claude_export_meta TO service_role;

ALTER TABLE public.claude_export_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claude_export_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "export_chunks_select_admin" ON public.claude_export_chunks
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "export_meta_select_admin" ON public.claude_export_meta
  FOR SELECT TO authenticated USING (public.is_admin());