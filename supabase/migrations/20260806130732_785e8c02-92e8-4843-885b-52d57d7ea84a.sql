REVOKE ALL ON FUNCTION public.audit_items_change() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_purchase_insert() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_movement_insert() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.current_user_email() FROM anon;
REVOKE ALL ON FUNCTION public.log_client_event(text, text, text, jsonb) FROM anon;