-- 1. Soft delete columns
ALTER TABLE public.medical_supply_items
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deleted_reason text;

CREATE INDEX IF NOT EXISTS medical_supply_items_deleted_at_idx
  ON public.medical_supply_items (deleted_at);

-- Physical deletes are no longer allowed; soft delete is the only path.
DROP POLICY IF EXISTS items_delete_admin ON public.medical_supply_items;
REVOKE DELETE ON public.medical_supply_items FROM authenticated;

-- 2. Append-only audit trail
DROP POLICY IF EXISTS audit_insert ON public.audit_logs;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT email FROM public.profiles WHERE id = auth.uid()), '');
$$;

CREATE OR REPLACE FUNCTION public.write_audit(
  _action text,
  _entity text,
  _entity_id text,
  _details jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, user_email, action, entity, entity_id, details)
  VALUES (auth.uid(), public.current_user_email(), _action, _entity, _entity_id, COALESCE(_details, '{}'::jsonb));
END;
$$;

-- Client may only record events the database cannot observe itself.
CREATE OR REPLACE FUNCTION public.log_client_event(
  _action text,
  _entity text,
  _entity_id text DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Your session has expired. Please sign in again.';
  END IF;
  IF _action NOT IN ('Login', 'Logout', 'Export') THEN
    RAISE EXCEPTION 'Unsupported audit action: %', _action;
  END IF;
  PERFORM public.write_audit(_action, _entity, _entity_id, _details);
END;
$$;

REVOKE ALL ON FUNCTION public.write_audit(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_client_event(text, text, text, jsonb) TO authenticated;

-- 3. Automatic audit triggers
CREATE OR REPLACE FUNCTION public.audit_items_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit('Create', 'medical_supply_items', NEW.id::text, jsonb_build_object(
      'item_code', NEW.item_code,
      'item_description', NEW.item_description,
      'available_stock', NEW.available_stock,
      'status', NEW.status
    ));
    RETURN NEW;
  END IF;

  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    PERFORM public.write_audit('Delete', 'medical_supply_items', NEW.id::text, jsonb_build_object(
      'item_code', NEW.item_code,
      'item_description', NEW.item_description,
      'reason', NEW.deleted_reason
    ));
    RETURN NEW;
  END IF;

  IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    PERFORM public.write_audit('Restore', 'medical_supply_items', NEW.id::text, jsonb_build_object(
      'item_code', NEW.item_code,
      'item_description', NEW.item_description
    ));
    RETURN NEW;
  END IF;

  IF to_jsonb(NEW) - 'updated_at' <> to_jsonb(OLD) - 'updated_at' THEN
    PERFORM public.write_audit('Edit', 'medical_supply_items', NEW.id::text, jsonb_build_object(
      'item_code', NEW.item_code,
      'item_description', NEW.item_description,
      'available_stock_before', OLD.available_stock,
      'available_stock_after', NEW.available_stock,
      'status_before', OLD.status,
      'status_after', NEW.status
    ));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_items_audit ON public.medical_supply_items;
CREATE TRIGGER trg_items_audit
  AFTER INSERT OR UPDATE ON public.medical_supply_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_items_change();

CREATE OR REPLACE FUNCTION public.audit_purchase_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.write_audit('Purchase', 'purchases', NEW.id::text, jsonb_build_object(
    'item_id', NEW.item_id,
    'quantity', NEW.quantity,
    'unit_price_aud', NEW.unit_price_aud,
    'supplier_name', NEW.supplier_name,
    'purchase_date', NEW.purchase_date
  ));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchases_audit ON public.purchases;
CREATE TRIGGER trg_purchases_audit
  AFTER INSERT ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.audit_purchase_insert();

CREATE OR REPLACE FUNCTION public.audit_movement_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.movement_type = 'Purchase Received' THEN
    RETURN NEW;
  END IF;
  PERFORM public.write_audit('Stock Adjustment', 'stock_movements', NEW.id::text, jsonb_build_object(
    'item_id', NEW.item_id,
    'movement_type', NEW.movement_type,
    'quantity_change', NEW.quantity_change,
    'stock_after', NEW.stock_after,
    'notes', NEW.notes
  ));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_movements_audit ON public.stock_movements;
CREATE TRIGGER trg_movements_audit
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.audit_movement_insert();

-- 4. Transactional procurement operations
CREATE OR REPLACE FUNCTION public.record_purchase(
  _item_id uuid,
  _quantity integer,
  _unit_price numeric,
  _supplier_name text,
  _supplier_email text,
  _purchase_date date
) RETURNS public.medical_supply_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _item public.medical_supply_items;
  _new_stock integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Your session has expired. Please sign in again.';
  END IF;
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'You do not have permission to record purchases.';
  END IF;
  IF _quantity IS NULL OR _quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity received must be a whole number greater than zero.';
  END IF;
  IF _unit_price IS NULL OR _unit_price <= 0 THEN
    RAISE EXCEPTION 'Unit price must be greater than zero.';
  END IF;
  IF _supplier_email IS NULL OR _supplier_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Please enter a valid supplier email address.';
  END IF;

  SELECT * INTO _item FROM public.medical_supply_items
    WHERE id = _item_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This supply item could not be found.';
  END IF;

  _new_stock := _item.available_stock + _quantity;

  UPDATE public.medical_supply_items SET
    available_stock = _new_stock,
    purchase_price_aud = _unit_price,
    supplier_name = _supplier_name,
    supplier_email = _supplier_email,
    last_purchased_date = _purchase_date
  WHERE id = _item_id
  RETURNING * INTO _item;

  INSERT INTO public.purchases (
    item_id, quantity, unit_price_aud, supplier_name, supplier_email, purchase_date, recorded_by
  ) VALUES (
    _item_id, _quantity, _unit_price, _supplier_name, _supplier_email,
    COALESCE(_purchase_date, (now() AT TIME ZONE 'Australia/Sydney')::date), auth.uid()
  );

  INSERT INTO public.stock_movements (
    item_id, movement_type, quantity_change, stock_after, notes, performed_by
  ) VALUES (
    _item_id, 'Purchase Received', _quantity, _new_stock,
    'Purchase received from ' || _supplier_name || ' at ' || to_char(_unit_price, 'FM999999990.00') || ' AUD per unit',
    auth.uid()
  );

  RETURN _item;
END;
$$;

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

  _new_stock := GREATEST(0, _item.available_stock + _change);

  UPDATE public.medical_supply_items SET available_stock = _new_stock
    WHERE id = _item_id RETURNING * INTO _item;

  INSERT INTO public.stock_movements (
    item_id, movement_type, quantity_change, stock_after, notes, performed_by
  ) VALUES (
    _item_id,
    CASE WHEN _change < 0 THEN 'Usage' ELSE 'Stock Adjustment' END,
    _new_stock - (_item.available_stock - _change - (_new_stock - _item.available_stock)),
    _new_stock, btrim(_reason), auth.uid()
  );

  RETURN _item;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_item(
  _item_id uuid,
  _reason text DEFAULT NULL
) RETURNS public.medical_supply_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _item public.medical_supply_items;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only practice administrators can archive supply items.';
  END IF;

  UPDATE public.medical_supply_items SET
    deleted_at = now(),
    deleted_by = auth.uid(),
    deleted_reason = NULLIF(btrim(COALESCE(_reason, '')), '')
  WHERE id = _item_id AND deleted_at IS NULL
  RETURNING * INTO _item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This supply item could not be found or is already archived.';
  END IF;

  RETURN _item;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_item(_item_id uuid)
RETURNS public.medical_supply_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _item public.medical_supply_items;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only practice administrators can restore supply items.';
  END IF;

  UPDATE public.medical_supply_items SET
    deleted_at = NULL, deleted_by = NULL, deleted_reason = NULL
  WHERE id = _item_id AND deleted_at IS NOT NULL
  RETURNING * INTO _item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This supply item could not be found or is not archived.';
  END IF;

  RETURN _item;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_purchase(uuid, integer, numeric, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_item(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_item(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.record_purchase(uuid, integer, numeric, text, text, date) FROM anon;
REVOKE ALL ON FUNCTION public.adjust_stock(uuid, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.soft_delete_item(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.restore_item(uuid) FROM anon;

-- 5. Scheduled reorder mailer support
CREATE OR REPLACE FUNCTION public.mark_reorder_notification(
  _notification_id uuid,
  _status text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _status NOT IN ('Sent', 'Failed', 'Logged') THEN
    RAISE EXCEPTION 'Unsupported notification status: %', _status;
  END IF;
  UPDATE public.reorder_notifications
    SET email_status = _status,
        sent_at = CASE WHEN _status = 'Sent' THEN now() ELSE sent_at END
  WHERE id = _notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_reorder_notification(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_reorder_notification(uuid, text) TO service_role;