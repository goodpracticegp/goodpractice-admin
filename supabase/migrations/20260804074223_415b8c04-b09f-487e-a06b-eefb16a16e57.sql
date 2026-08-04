-- lock down internal functions
REVOKE ALL ON FUNCTION public.items_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.items_after_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_staff_or_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin() TO authenticated;

DROP POLICY "items_insert" ON public.medical_supply_items;
DROP POLICY "items_update" ON public.medical_supply_items;
CREATE POLICY "items_insert" ON public.medical_supply_items FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "items_update" ON public.medical_supply_items FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

DROP POLICY "movements_insert" ON public.stock_movements;
CREATE POLICY "movements_insert" ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin() AND performed_by = auth.uid());

DROP POLICY "purchases_insert" ON public.purchases;
CREATE POLICY "purchases_insert" ON public.purchases FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin() AND recorded_by = auth.uid());

CREATE POLICY "notifications_update_admin" ON public.reorder_notifications FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ demo accounts ============
DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'admin@goodpracticegp.com.au', extensions.crypt('GPAdmin2026!', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Dr Alison Reid"}'::jsonb, now(), now()),
    (staff_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'staff@goodpracticegp.com.au', extensions.crypt('GPStaff2026!', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Marcus Okafor"}'::jsonb, now(), now());

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), admin_id, admin_id::text, 'email',
      json_build_object('sub', admin_id::text, 'email', 'admin@goodpracticegp.com.au', 'email_verified', true)::jsonb, now(), now(), now()),
    (gen_random_uuid(), staff_id, staff_id::text, 'email',
      json_build_object('sub', staff_id::text, 'email', 'staff@goodpracticegp.com.au', 'email_verified', true)::jsonb, now(), now(), now());

  INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin'), (staff_id, 'staff');
END $$;

-- ============ supply items ============
INSERT INTO public.medical_supply_items
 (item_code, item_description, category, supplier_name, supplier_email, purchase_price_aud,
  available_stock, reorder_level, reorder_quantity, last_purchased_date, expiry_date, status)
VALUES
 ('MS-0001','Nitrile Examination Gloves, Medium, Box of 100','PPE','MedSupplies Australia','orders@medsuppliesaustralia.example.com.au',18.50,240,60,200,current_date-14,current_date+400,'In Stock'),
 ('MS-0002','Nitrile Examination Gloves, Large, Box of 100','PPE','MedSupplies Australia','orders@medsuppliesaustralia.example.com.au',18.50,45,60,200,current_date-30,current_date+380,'In Stock'),
 ('MS-0003','COVID-19 Rapid Antigen Tests, Pack of 20','Diagnostic Equipment','HealthEquip Co','sales@healthequipco.example.com.au',72.00,0,10,40,current_date-60,current_date+75,'In Stock'),
 ('MS-0004','Disposable Face Shields, Anti-Fog','PPE','HealthEquip Co','sales@healthequipco.example.com.au',3.95,180,50,150,current_date-21,NULL,'In Stock'),
 ('MS-0005','KN95 Respirator Masks, Box of 50','PPE','MedSupplies Australia','orders@medsuppliesaustralia.example.com.au',34.00,12,15,60,current_date-45,current_date+520,'In Stock'),
 ('MS-0006','Luer Slip Syringes 5mL, Box of 100','Consumables','PharmaDirect AU','procurement@pharmadirectau.example.com.au',22.75,320,80,250,current_date-10,current_date+700,'In Stock'),
 ('MS-0007','Hypodermic Needles 23G x 25mm, Box of 100','Consumables','PharmaDirect AU','procurement@pharmadirectau.example.com.au',14.20,410,100,300,current_date-12,current_date+650,'In Stock'),
 ('MS-0008','Conforming Bandage 7.5cm x 4m, Pack of 12','Wound Care','WoundCare Supplies AU','orders@woundcaresuppliesau.example.com.au',26.40,96,24,72,current_date-25,NULL,'In Stock'),
 ('MS-0009','Sterile Gauze Swabs 7.5cm, Pack of 100','Wound Care','WoundCare Supplies AU','orders@woundcaresuppliesau.example.com.au',12.90,140,40,120,current_date-18,current_date+900,'In Stock'),
 ('MS-0010','Alcohol Antiseptic Wipes, Box of 200','Cleaning and Hygiene','CleanMed Distributors','info@cleanmeddistributors.example.com.au',16.80,28,30,100,current_date-33,current_date+430,'In Stock'),
 ('MS-0011','Influenza Vaccine, Quadrivalent, 10 Dose Pack','Vaccines','PharmaDirect AU','procurement@pharmadirectau.example.com.au',185.00,24,8,20,current_date-40,current_date+60,'In Stock'),
 ('MS-0012','Tetanus Toxoid Vaccine, Single Dose','Vaccines','PharmaDirect AU','procurement@pharmadirectau.example.com.au',32.50,36,12,30,current_date-52,current_date+210,'In Stock'),
 ('MS-0013','Spirometry Mouthpieces, Disposable, Box of 50','Diagnostic Equipment','HealthEquip Co','sales@healthequipco.example.com.au',44.00,6,10,40,current_date-70,NULL,'In Stock'),
 ('MS-0014','ECG Electrodes, Adult, Bag of 50','Diagnostic Equipment','HealthEquip Co','sales@healthequipco.example.com.au',28.60,150,40,120,current_date-16,current_date+310,'In Stock'),
 ('MS-0015','Digital Thermometer Probe Covers, Box of 100','Consumables','MedSupplies Australia','orders@medsuppliesaustralia.example.com.au',9.75,220,50,150,current_date-22,NULL,'In Stock'),
 ('MS-0016','Instant Hand Sanitiser 500mL Pump','Cleaning and Hygiene','CleanMed Distributors','info@cleanmeddistributors.example.com.au',7.40,84,20,60,current_date-19,current_date+88,'In Stock'),
 ('MS-0017','Surface Disinfectant Wipes, Canister of 200','Cleaning and Hygiene','CleanMed Distributors','info@cleanmeddistributors.example.com.au',13.25,60,18,54,current_date-27,current_date+540,'In Stock'),
 ('MS-0018','Paracetamol 500mg Tablets, Box of 100','Medications','PharmaDirect AU','procurement@pharmadirectau.example.com.au',5.90,110,30,90,current_date-35,current_date+480,'In Stock'),
 ('MS-0019','Adrenaline 1:1000 Ampoules, Box of 5','Medications','PharmaDirect AU','procurement@pharmadirectau.example.com.au',48.00,8,4,12,current_date-48,current_date+85,'In Stock'),
 ('MS-0020','Salbutamol Inhaler 100mcg','Medications','PharmaDirect AU','procurement@pharmadirectau.example.com.au',11.30,42,12,36,current_date-29,current_date+365,'In Stock'),
 ('MS-0021','A4 Printer Paper, Ream of 500','Office Supplies','OfficeWorks Direct AU','supply@officeworksdirectau.example.com.au',6.95,0,10,40,current_date-90,NULL,'In Stock'),
 ('MS-0022','Prescription Pads, Pack of 10','Office Supplies','OfficeWorks Direct AU','supply@officeworksdirectau.example.com.au',24.00,34,10,30,current_date-55,NULL,'In Stock'),
 ('MS-0023','Sharps Disposal Container 5L','Consumables','MedSupplies Australia','orders@medsuppliesaustralia.example.com.au',15.60,52,15,45,current_date-24,NULL,'In Stock'),
 ('MS-0024','Adhesive Wound Dressings 6cm x 7cm, Box of 50','Wound Care','WoundCare Supplies AU','orders@woundcaresuppliesau.example.com.au',19.80,88,25,75,current_date-13,current_date+620,'Discontinued');

-- initial stock movements for every item
INSERT INTO public.stock_movements (item_id, movement_type, quantity_change, stock_after, notes, created_at)
SELECT id, 'Initial Stock', available_stock, available_stock, 'Opening balance recorded at module go live', created_at - interval '3 days'
FROM public.medical_supply_items;

-- a handful of recent purchases and usage movements
INSERT INTO public.purchases (item_id, quantity, unit_price_aud, supplier_name, supplier_email, purchase_date, created_at)
SELECT i.id, v.qty, i.purchase_price_aud, i.supplier_name, i.supplier_email, i.last_purchased_date, now() - (v.ord || ' hours')::interval
FROM public.medical_supply_items i
JOIN (VALUES
  ('MS-0001',200,1),('MS-0006',250,4),('MS-0007',300,7),('MS-0014',120,10),
  ('MS-0009',120,14),('MS-0024',75,20),('MS-0015',150,26),('MS-0020',36,32),
  ('MS-0004',150,40),('MS-0017',54,50)
) AS v(code, qty, ord) ON v.code = i.item_code;

INSERT INTO public.stock_movements (item_id, movement_type, quantity_change, stock_after, notes, created_at)
SELECT i.id, 'Usage', -v.qty, i.available_stock, v.note, now() - (v.ord || ' hours')::interval
FROM public.medical_supply_items i
JOIN (VALUES
  ('MS-0002',15,'Consulting room restock',2),
  ('MS-0005',8,'Treatment room usage',5),
  ('MS-0010',12,'Nurse station usage',8),
  ('MS-0013',4,'Spirometry clinic session',11),
  ('MS-0019',2,'Emergency trolley check',16),
  ('MS-0003',20,'Respiratory clinic usage',21),
  ('MS-0021',10,'Reception printing',30)
) AS v(code, qty, note, ord) ON v.code = i.item_code;

-- push the intended low stock and out of stock items through the reorder automation
UPDATE public.medical_supply_items SET reorder_notified = false WHERE item_code IN
  ('MS-0002','MS-0005','MS-0010','MS-0013','MS-0003','MS-0021');
UPDATE public.medical_supply_items SET available_stock = available_stock WHERE item_code IN
  ('MS-0002','MS-0005','MS-0010','MS-0013','MS-0003','MS-0021');
-- refresh statuses on all remaining rows
UPDATE public.medical_supply_items SET updated_at = now();