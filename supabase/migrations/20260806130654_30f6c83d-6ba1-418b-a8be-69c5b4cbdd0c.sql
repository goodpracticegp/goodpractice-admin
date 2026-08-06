CREATE OR REPLACE FUNCTION public.adjust_stock(
  _item_id uuid,
  _change integer,
  _reason text
) RETURNS public.medical_supply_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _item public.medical_supply_items;
  _old_stock integer;
  _new_stock integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Your session has expired. Please sign in again.';
  END IF;
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only practice administrators can adjust stock levels.';
  END IF;
  IF _change IS NULL OR _change = 0 THEN
    RAISE EXCEPTION 'Please enter a stock change other than zero.';
  END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN
    RAISE EXCEPTION 'Please give a reason for this stock adjustment.';
  END IF;

  SELECT * INTO _item FROM public.medical_supply_items
    WHERE id = _item_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This supply item could not be found.';
  END IF;

  _old_stock := _item.available_stock;
  _new_stock := GREATEST(0, _old_stock + _change);

  UPDATE public.medical_supply_items SET available_stock = _new_stock
    WHERE id = _item_id RETURNING * INTO _item;

  INSERT INTO public.stock_movements (
    item_id, movement_type, quantity_change, stock_after, notes, performed_by
  ) VALUES (
    _item_id,
    CASE WHEN _change < 0 THEN 'Usage' ELSE 'Stock Adjustment' END,
    _new_stock - _old_stock,
    _new_stock, btrim(_reason), auth.uid()
  );

  RETURN _item;
END;
$$;

REVOKE ALL ON FUNCTION public.record_purchase(uuid, integer, numeric, text, text, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_stock(uuid, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_item(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_item(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_client_event(text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff_or_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.compute_item_status(integer, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_items_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_purchase_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_movement_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.items_before_write() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.items_after_write() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_purchase(uuid, integer, numeric, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_item(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_client_event(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_item_status(integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_purchase(uuid, integer, numeric, text, text, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;