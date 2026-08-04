-- ============ roles ============
CREATE TYPE public.app_role AS ENUM ('admin','staff');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- ============ supply items ============
CREATE TABLE public.medical_supply_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code text NOT NULL UNIQUE,
  item_description text NOT NULL,
  category text NOT NULL,
  supplier_name text NOT NULL,
  supplier_email text NOT NULL,
  purchase_price_aud numeric(10,2) NOT NULL DEFAULT 0,
  available_stock integer NOT NULL DEFAULT 0,
  reorder_level integer NOT NULL DEFAULT 0,
  reorder_quantity integer NOT NULL DEFAULT 0,
  last_purchased_date date,
  expiry_date date,
  status text NOT NULL DEFAULT 'In Stock',
  reorder_notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_supply_items TO authenticated;
GRANT ALL ON public.medical_supply_items TO service_role;
ALTER TABLE public.medical_supply_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_select" ON public.medical_supply_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "items_insert" ON public.medical_supply_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "items_update" ON public.medical_supply_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "items_delete_admin" ON public.medical_supply_items FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.medical_supply_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL,
  quantity_change integer NOT NULL,
  stock_after integer NOT NULL,
  notes text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movements_select" ON public.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "movements_insert" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.medical_supply_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  unit_price_aud numeric(10,2) NOT NULL,
  supplier_name text NOT NULL,
  supplier_email text NOT NULL,
  purchase_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Australia/Sydney')::date,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases_select" ON public.purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchases_insert" ON public.purchases FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.reorder_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.medical_supply_items(id) ON DELETE SET NULL,
  item_code text NOT NULL,
  item_description text NOT NULL,
  available_stock integer NOT NULL,
  reorder_level integer NOT NULL,
  reorder_quantity integer NOT NULL,
  supplier_name text NOT NULL,
  supplier_email text NOT NULL,
  sent_to text NOT NULL DEFAULT 'info@goodpracticegp.com.au',
  sent_at timestamptz NOT NULL DEFAULT now(),
  email_status text NOT NULL DEFAULT 'Logged',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reorder_notifications TO authenticated;
GRANT ALL ON public.reorder_notifications TO service_role;
ALTER TABLE public.reorder_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select" ON public.reorder_notifications FOR SELECT TO authenticated USING (true);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text NOT NULL DEFAULT '',
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_admin" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============ automation ============
CREATE OR REPLACE FUNCTION public.compute_item_status(_stock integer, _reorder_level integer, _current_status text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF _current_status = 'Discontinued' THEN RETURN 'Discontinued'; END IF;
  IF _stock <= 0 THEN RETURN 'Out of Stock'; END IF;
  IF _stock <= _reorder_level THEN RETURN 'Reorder Required'; END IF;
  IF _stock::numeric <= _reorder_level::numeric * 1.25 THEN RETURN 'Low Stock'; END IF;
  RETURN 'In Stock';
END;
$$;

CREATE OR REPLACE FUNCTION public.items_before_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.status := public.compute_item_status(NEW.available_stock, NEW.reorder_level, NEW.status);
  IF NEW.status = 'Discontinued' THEN
    RETURN NEW;
  END IF;
  IF NEW.available_stock <= NEW.reorder_level THEN
    IF TG_OP = 'INSERT' THEN
      NEW.reorder_notified := true;
    ELSIF NOT COALESCE(OLD.reorder_notified, false) THEN
      NEW.reorder_notified := true;
    END IF;
  ELSE
    NEW.reorder_notified := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.items_after_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'Discontinued' THEN RETURN NEW; END IF;
  IF NEW.reorder_notified AND (TG_OP = 'INSERT' OR NOT COALESCE(OLD.reorder_notified, false)) THEN
    INSERT INTO public.reorder_notifications (
      item_id, item_code, item_description, available_stock, reorder_level,
      reorder_quantity, supplier_name, supplier_email, email_status
    ) VALUES (
      NEW.id, NEW.item_code, NEW.item_description, NEW.available_stock, NEW.reorder_level,
      NEW.reorder_quantity, NEW.supplier_name, NEW.supplier_email, 'Logged'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_items_before_write BEFORE INSERT OR UPDATE ON public.medical_supply_items
  FOR EACH ROW EXECUTE FUNCTION public.items_before_write();
CREATE TRIGGER trg_items_after_write AFTER INSERT OR UPDATE ON public.medical_supply_items
  FOR EACH ROW EXECUTE FUNCTION public.items_after_write();

-- new signups get a profile row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX idx_movements_item ON public.stock_movements(item_id, created_at DESC);
CREATE INDEX idx_purchases_item ON public.purchases(item_id, created_at DESC);
CREATE INDEX idx_notifications_item ON public.reorder_notifications(item_id, created_at DESC);