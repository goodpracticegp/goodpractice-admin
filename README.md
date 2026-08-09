# Practice Supplies Manager

Build "Good Practice GP Surgery, Administration System": a secure medical centre administration backend for a real Australian GP practice, starting with a complete Medical Supply Procurement and Inventory module. Use Lovable Cloud (Supabase) for database, authentication and edge functions. This is a real internal tool: every feature and button must work, no placeholder buttons, no lorem ipsum.

BRAND AND DESIGN
Clean professional medical-centre admin design: white background, deep navy primary (#123A5C), teal secondary (#0E7C7B), restrained red accent (#C62828) for warnings and alerts, generous white space, consistent card and table styling, sidebar navigation with icons, fully responsive for desktop, tablet and mobile (collapsible sidebar). Brand name in the header: "Good Practice (GP) Surgery" with a small red heart mark and the tagline "Quality Care. Close to Home.". Australian conventions everywhere: dates DD/MM/YYYY, currency AUD with $ and two decimals, timezone Australia/Sydney for all displayed times, Australian English spelling. Do not use en or em dashes in any visible text; write "to" in ranges.

AUTHENTICATION AND ROLES
Supabase email/password auth with a proper login screen (no public signup; admins create users). Roles via a user_roles table with a security definer helper function: "admin" (full access) and "staff" (view and record purchases only; no delete, no user management). Protect all routes; redirect unauthenticated users to login. Seed two accounts and show them on the login page in a small demo-credentials note: admin@goodpracticegp.com.au / GPAdmin2026! (admin) and staff@goodpracticegp.com.au / GPStaff2026! (staff). Enforce role checks in RLS policies, not just the UI.

DATABASE STRUCTURE (with RLS on every table)
1. medical_supply_items: id uuid, item_code text unique (format like MS-0001), item_description text, category text (Consumables, PPE, Medications, Vaccines, Wound Care, Diagnostic Equipment, Office Supplies, Cleaning and Hygiene), supplier_name text, supplier_email text, purchase_price_aud numeric(10,2), available_stock integer, reorder_level integer, reorder_quantity integer, last_purchased_date date, expiry_date date nullable, status text (In Stock, Low Stock, Out of Stock, Reorder Required, Discontinued), reorder_notified boolean default false (the low-stock event latch), created_at, updated_at.
2. stock_movements: id, item_id fk, movement_type (Purchase Received, Stock Adjustment, Usage, Initial Stock), quantity_change integer, stock_after integer, notes, performed_by uuid, created_at.
3. purchases: id, item_id fk, quantity integer, unit_price_aud numeric, supplier_name, supplier_email, purchase_date date, recorded_by uuid, created_at.
4. reorder_notifications: id, item_id fk, item_code, item_description, available_stock, reorder_level, reorder_quantity, supplier_name, supplier_email, sent_to text default 'info@goodpracticegp.com.au', sent_at timestamptz, email_status text (Sent, Failed, Logged), created_at.
5. audit_logs: id, user_id, user_email, action text, entity text, entity_id, details jsonb, created_at. Log every create, edit, delete, purchase, login and export.
6. user_roles: user_id, role. Plus a profiles table with full_name.

REORDER AUTOMATION (core business rule, implement in the database and an edge function)
Whenever available_stock changes (item edit, purchase received, usage adjustment): recompute status (Out of Stock if 0, Reorder Required if stock is less than or equal to reorder_level, otherwise Low Stock if within 25 percent above reorder level, otherwise In Stock; Discontinued is manual and never auto-changed). When stock first becomes less than or equal to reorder_level AND reorder_notified is false: set reorder_notified true, insert a reorder_notifications row with all item details and the timestamp, and invoke an edge function "send-reorder-email" that emails info@goodpracticegp.com.au with subject "Reorder Required: [item_code] [item_description]" and a tidy HTML body containing Item Code, Item Description, Available Stock, Reorder Level, Reorder Quantity, Supplier Name and Supplier Email, plus the practice branding. Use Resend from the edge function if a RESEND_API_KEY secret exists; if the key is missing or sending fails, still record the notification row with email_status "Logged" or "Failed" and show a dismissible banner in the app telling the admin that email delivery needs the Resend API key to be configured. When stock is replenished above the reorder level, reset reorder_notified to false so the next low-stock event triggers exactly one new email. Never send duplicate emails for the same low-stock event.

MEDICAL SUPPLIES MODULE (pages)
1. Supplies list: searchable (item code, description, supplier), filterable (category, status, supplier), sortable table with pagination; colour-coded status badges (red Out of Stock, amber Reorder Required, yellow Low Stock, green In Stock, grey Discontinued); row actions View, Edit, Record Purchase, Delete (admin only, with a confirmation dialog naming the item). Export buttons: CSV and Excel (.xlsx) of the current filtered view, with Australian date formats in the export.
2. Add and Edit item forms: all fields listed above with validation (required fields, email format for supplier email, non-negative integers for stock and levels, price greater than 0, expiry date optional but must be a future date on creation, item code auto-suggested as next MS-xxxx but editable and unique). Friendly inline error messages and success toasts.
3. Item detail view: all fields, current status, stock movement history, purchase history, notification history for that item.
4. Record Purchase dialog: quantity received, unit price AUD, supplier name and email (prefilled from the item, editable), purchase date (default today Sydney time). On save: increase available_stock, update purchase_price_aud, supplier fields and last_purchased_date, insert purchases row and a stock_movements row, recompute status and reset the reorder latch if stock is now above reorder level.
5. Stock adjustment action (admin): plus or minus quantity with a reason, recorded as a stock movement, triggering the same status and reorder logic.

DASHBOARD (landing page after login)
Attractive stat cards: Total supply items, Items in stock, Low stock items, Out of stock items, Reorder required, Expiring within 90 days. A prominent red-bordered warning panel listing items currently flagged Reorder Required with quick links. Sections for Recent purchases (last 10), Recent stock movements (last 10), Recent reorder notifications (last 10) with sent time in Sydney time. A small bar or donut chart of items by category. All numbers computed live from the database.

OTHER PAGES
Audit log page (admin only): filterable by user, action and date range, exportable to CSV. Settings page (admin only): manage users (create staff or admin accounts), and a field showing the notification recipient info@goodpracticegp.com.au. A tidy 404 page. Header shows the signed-in user, role badge, and sign out.

SAMPLE DATA
Seed about 24 realistic Australian GP supply items across the categories (examination gloves boxes, rapid antigen tests, face shields, KN95 masks, syringes, bandages, antiseptic wipes, influenza vaccines, spirometry mouthpieces, ECG electrodes, printer paper, hand sanitiser, and so on) with plausible AUD prices and suppliers (generic supplier names like MedSupplies Australia, HealthEquip Co, PharmaDirect AU with example.com.au emails). Include at least: 3 items already at or below reorder level (flagged Reorder Required with a notification row), 2 out of stock, 3 expiring within 90 days, the rest healthy. Seed matching stock movements and purchases so the dashboard looks alive.

TESTING BEFORE FINISHING
Verify with the browser: login works for both roles, staff cannot see delete or settings, adding an item works, editing stock down to the reorder level flags it and inserts exactly one notification, recording a purchase raises stock and resets the latch, lowering it again creates a second notification, CSV and Excel exports download, all dashboard counts match the data, mobile layout works. Fix anything broken before reporting done.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://goodpractice-admin.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b6ee697b-692f-4342-a284-5d26705deb7a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
