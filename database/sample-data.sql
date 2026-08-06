-- ─────────────────────────────────────────────────────────────────
-- Sample Data for Testing
-- Run this in Supabase SQL Editor after schema.sql
-- ─────────────────────────────────────────────────────────────────

-- ── Sample Users (Authentication) ────────────────────────────────
-- Passwords: Super@123, Admin@123, Employee@123
INSERT INTO users (name, email, password_hash, role, designation, department, phone) VALUES
  ('Super Admin User', 'super.admin@crm.demo', '$2a$10$YIjAY7o0ww0uu9YvQNIX/.qmWL3KzQZvl50GJ7LoiIbwwxCKzpBfi', 'super_admin', 'Chief Administrator', 'Administration', '+91-9999999999'),
  ('Admin User', 'admin@crm.demo', '$2a$10$HqM8.6MzJm5K1V3o8YgXJOpIoZ0I.XPJ1F4d5L8k2Qs9p1QRoIkC6', 'admin', 'Manager', 'Operations', '+91-8888888888'),
  ('Team Lead User', 'team.lead@crm.demo', '$2a$10$HqM8.6MzJm5K1V3o8YgXJOpIoZ0I.XPJ1F4d5L8k2Qs9p1QRoIkC6', 'admin', 'Team Lead', 'Sales', '+91-7777777777'),
  ('Employee One', 'employee@crm.demo', '$2a$10$W6eN4QmVL9pP2sRxT8bYO.eHkLj3Zc9M1nUpX5Y6a7B4D2fgHQ.Fe', 'employee', 'Sales Executive', 'Sales', '+91-6666666666'),
  ('Employee Two', 'employee2@crm.demo', '$2a$10$W6eN4QmVL9pP2sRxT8bYO.eHkLj3Zc9M1nUpX5Y6a7B4D2fgHQ.Fe', 'employee', 'Inventory Specialist', 'Warehouse', '+91-5555555555');

-- ── Sample Roles (RBAC) ──────────────────────────────────────────
INSERT INTO roles (name, description, is_system, is_active) VALUES
  ('super_admin', 'Full system access - can manage all resources and users', true, true),
  ('admin', 'Administrative access - can manage resources and team members', true, true),
  ('team_lead', 'Team lead access - can manage team and view reports', false, true),
  ('employee', 'Standard employee access - can view and manage assigned tasks', true, true),
  ('new_user', 'New user with no permissions - awaiting admin approval', true, true);

-- ── Sample Permissions (RBAC) ────────────────────────────────────
-- Clients
INSERT INTO permissions (key, label, description, category, is_active) VALUES
  ('clients.view', 'View Clients', 'View client information and details', 'Clients', true),
  ('clients.create', 'Create Client', 'Create new client records', 'Clients', true),
  ('clients.edit', 'Edit Client', 'Edit existing client information', 'Clients', true),
  ('clients.delete', 'Delete Client', 'Delete client records', 'Clients', true);

-- Inventory
INSERT INTO permissions (key, label, description, category, is_active) VALUES
  ('inventory.view', 'View Inventory', 'View inventory items and stock levels', 'Inventory', true),
  ('inventory.create', 'Create Inventory', 'Add new inventory items', 'Inventory', true),
  ('inventory.edit', 'Edit Inventory', 'Edit inventory item details', 'Inventory', true),
  ('inventory.delete', 'Delete Inventory', 'Delete inventory items', 'Inventory', true),
  ('inventory.bulk_upload', 'Bulk Upload Inventory', 'Upload inventory items in bulk', 'Inventory', true);

-- Invoices
INSERT INTO permissions (key, label, description, category, is_active) VALUES
  ('invoices.view', 'View Invoices', 'View invoice records', 'Invoices', true),
  ('invoices.create', 'Create Invoice', 'Create new invoices', 'Invoices', true),
  ('invoices.edit', 'Edit Invoice', 'Edit invoice details', 'Invoices', true),
  ('invoices.delete', 'Delete Invoice', 'Delete invoice records', 'Invoices', true);

-- Quotations
INSERT INTO permissions (key, label, description, category, is_active) VALUES
  ('quotations.view', 'View Quotations', 'View quotation records', 'Quotations', true),
  ('quotations.create', 'Create Quotation', 'Create new quotations', 'Quotations', true),
  ('quotations.edit', 'Edit Quotation', 'Edit quotation details', 'Quotations', true),
  ('quotations.delete', 'Delete Quotation', 'Delete quotation records', 'Quotations', true),
  ('quotations.convert', 'Convert Quotation', 'Convert quotation to invoice', 'Quotations', true);

-- Leads
INSERT INTO permissions (key, label, description, category, is_active) VALUES
  ('leads.view', 'View Leads', 'View lead records', 'Leads', true),
  ('leads.create', 'Create Lead', 'Create new lead records', 'Leads', true),
  ('leads.edit', 'Edit Lead', 'Edit lead details', 'Leads', true),
  ('leads.delete', 'Delete Lead', 'Delete lead records', 'Leads', true);

-- Warehouse
INSERT INTO permissions (key, label, description, category, is_active) VALUES
  ('warehouse.view', 'View Warehouse', 'View warehouse information', 'Warehouse', true),
  ('warehouse.create', 'Create Warehouse', 'Create new warehouses', 'Warehouse', true),
  ('warehouse.edit', 'Edit Warehouse', 'Edit warehouse details', 'Warehouse', true),
  ('warehouse.delete', 'Delete Warehouse', 'Delete warehouse records', 'Warehouse', true);

-- Staff Management
INSERT INTO permissions (key, label, description, category, is_active) VALUES
  ('staff.view', 'View Staff', 'View staff information', 'Staff', true),
  ('staff.create', 'Create Staff', 'Add new staff members', 'Staff', true),
  ('staff.edit', 'Edit Staff', 'Edit staff information', 'Staff', true),
  ('staff.delete', 'Delete Staff', 'Delete staff records', 'Staff', true);

-- User Management
INSERT INTO permissions (key, label, description, category, is_active) VALUES
  ('users.view', 'View Users', 'View user accounts and details', 'Users', true),
  ('users.create', 'Create User', 'Create new user accounts', 'Users', true),
  ('users.edit', 'Edit User', 'Edit user information and roles', 'Users', true),
  ('users.delete', 'Delete User', 'Delete user accounts', 'Users', true);

-- Reports
INSERT INTO permissions (key, label, description, category, is_active) VALUES
  ('reports.view', 'View Reports', 'View all reports and dashboards', 'Reports', true),
  ('reports.export', 'Export Reports', 'Export report data', 'Reports', true);

-- Settings & RBAC
INSERT INTO permissions (key, label, description, category, is_active) VALUES
  ('settings.view', 'View Settings', 'View system settings', 'Settings', true),
  ('settings.edit', 'Edit Settings', 'Modify system settings', 'Settings', true),
  ('rbac.manage', 'Manage RBAC', 'Manage roles, permissions, and access control', 'RBAC', true);

-- ── Assign Permissions to Roles ──────────────────────────────────

-- Super Admin: Full access to all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'super_admin' AND p.is_active = true;

-- Admin: Access to most features except RBAC management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'admin' 
AND p.key IN (
  -- Clients
  'clients.view', 'clients.create', 'clients.edit',
  -- Inventory
  'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.bulk_upload',
  -- Invoices
  'invoices.view', 'invoices.create', 'invoices.edit',
  -- Quotations
  'quotations.view', 'quotations.create', 'quotations.edit', 'quotations.convert',
  -- Leads
  'leads.view', 'leads.create', 'leads.edit',
  -- Warehouse
  'warehouse.view', 'warehouse.create', 'warehouse.edit',
  -- Staff
  'staff.view', 'staff.create', 'staff.edit',
  -- Users
  'users.view', 'users.create', 'users.edit',
  -- Reports
  'reports.view', 'reports.export',
  -- Settings
  'settings.view'
);

-- Team Lead: Limited admin access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'team_lead' 
AND p.key IN (
  -- Clients
  'clients.view',
  -- Inventory
  'inventory.view', 'inventory.create', 'inventory.edit',
  -- Invoices
  'invoices.view', 'invoices.create',
  -- Quotations
  'quotations.view', 'quotations.create', 'quotations.convert',
  -- Leads
  'leads.view', 'leads.create', 'leads.edit',
  -- Warehouse
  'warehouse.view',
  -- Staff
  'staff.view',
  -- Reports
  'reports.view'
);

-- Employee: Read-only and creation access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'employee' 
AND p.key IN (
  -- Clients
  'clients.view',
  -- Inventory
  'inventory.view', 'inventory.create',
  -- Invoices
  'invoices.view',
  -- Quotations
  'quotations.view', 'quotations.create',
  -- Leads
  'leads.view', 'leads.create',
  -- Warehouse
  'warehouse.view',
  -- Reports
  'reports.view'
);

-- ── Sample Clients ───────────────────────────────────────────────
INSERT INTO clients (name, email, phone, company, address, gst_number, business_type, gst_rate, gst_available) VALUES
  ('Acme Manufacturing Ltd', 'contact@acme.com', '+91-9876543210', 'Acme Manufacturing', '123 Industrial Park, Mumbai', '27AABCU1234F1Z0', 'Manufacturer', 18, true),
  ('Global Distributors Inc', 'sales@globaldist.com', '+91-9988776655', 'Global Distributors', '456 Trade Center, Bangalore', '29AABCD5678G2Z5', 'Distributor', 18, true),
  ('Metro Retail Solutions', 'info@metroretail.com', '+91-8765432109', 'Metro Retail', '789 Shopping Complex, Delhi', '07AABCR1234H3Z0', 'Retailer', 9, true),
  ('TechTrade Enterprises', 'contact@techtrade.in', '+91-7654321098', 'TechTrade Corp', '321 Tech Hub, Hyderabad', '36AABCT5678I4Z2', 'Trader', 18, true),
  ('Premium Goods Co', 'hello@premiumgoods.com', '+91-6543210987', 'Premium Goods', '654 Premium Plaza, Pune', '27AABCX9876J5Z3', 'Other', 5, false);

-- ── Sample Warehouses ────────────────────────────────────────────
INSERT INTO warehouses (name, location) VALUES
  ('Mumbai Main Warehouse', 'Dockyard Area, Mumbai'),
  ('Delhi Distribution Center', 'CHHD Gurgaon, Delhi'),
  ('Bangalore Storage Facility', 'Electronics City, Bangalore'),
  ('Chennai Port Warehouse', 'Port Area, Chennai');

-- ── Sample Staff ─────────────────────────────────────────────────
INSERT INTO staff (name, warehouse_id) VALUES
  ('Rajesh Kumar', (SELECT id FROM warehouses WHERE name = 'Mumbai Main Warehouse')),
  ('Priya Nair', (SELECT id FROM warehouses WHERE name = 'Mumbai Main Warehouse')),
  ('Amit Singh', (SELECT id FROM warehouses WHERE name = 'Delhi Distribution Center')),
  ('Sunitha Reddy', (SELECT id FROM warehouses WHERE name = 'Bangalore Storage Facility')),
  ('Mohammed Hassan', (SELECT id FROM warehouses WHERE name = 'Chennai Port Warehouse'));

-- ── Sample Inventory Items ───────────────────────────────────────
INSERT INTO inventory_items (id, client_id, commodity, description, cbm, quantity, unit, packing, warehouse_id, status, received_date) VALUES
  ('INV-STEEL-001', (SELECT id FROM clients WHERE name = 'Acme Manufacturing Ltd'), 'Steel Coils', 'Hot Rolled Coils 2mm', 15.5, 150, 'pieces', 'Wooden Pallets', (SELECT id FROM warehouses WHERE name = 'Mumbai Main Warehouse'), 'In Stock', '2026-03-15'),
  ('INV-ELEC-002', (SELECT id FROM clients WHERE name = 'Global Distributors Inc'), 'Electronics', 'USB Cables Type C', 2.3, 5000, 'pieces', 'Cardboard Boxes', (SELECT id FROM warehouses WHERE name = 'Delhi Distribution Center'), 'In Stock', '2026-03-10'),
  ('INV-TEXT-003', (SELECT id FROM clients WHERE name = 'Metro Retail Solutions'), 'Textiles', 'Cotton Fabric Roll', 8.7, 200, 'rolls', 'Plastic Wrap', (SELECT id FROM warehouses WHERE name = 'Bangalore Storage Facility'), 'In Stock', '2026-03-08'),
  ('INV-CHEM-004', (SELECT id FROM clients WHERE name = 'TechTrade Enterprises'), 'Chemicals', 'Industrial Cleaner Bulk', 12.4, 500, 'liters', 'Plastic Containers', (SELECT id FROM warehouses WHERE name = 'Chennai Port Warehouse'), 'In Stock', '2026-03-05'),
  ('INV-MACH-005', (SELECT id FROM clients WHERE name = 'Premium Goods Co'), 'Machinery', 'Motor Pumps 5HP', 5.2, 25, 'pieces', 'Wooden Crates', (SELECT id FROM warehouses WHERE name = 'Mumbai Main Warehouse'), 'In Stock', '2026-03-01');

-- ── Sample Invoices ─────────────────────────────────────────────
INSERT INTO invoices (id, client_id, subtotal, gst_rate, gst_amount, total_amount, date, due_date, status, notes, created_by) VALUES
  ('INV-2026-001', (SELECT id FROM clients WHERE name = 'Acme Manufacturing Ltd'), 50000, 18, 9000, 59000, '2026-03-20', '2026-04-20', 'Pending', 'Steel coil shipment invoice', 'admin@crm.demo'),
  ('INV-2026-002', (SELECT id FROM clients WHERE name = 'Global Distributors Inc'), 25000, 18, 4500, 29500, '2026-03-18', '2026-04-18', 'Paid', 'Electronics bulk order', 'admin@crm.demo'),
  ('INV-2026-003', (SELECT id FROM clients WHERE name = 'Metro Retail Solutions'), 15000, 9, 1350, 16350, '2026-03-15', '2026-04-15', 'Draft', 'Textile fabrics - pending approval', 'employee@crm.demo');

-- ── Sample Invoice Line Items ───────────────────────────────────
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount) VALUES
  ('INV-2026-001', 'Steel Coils - Hot Rolled 2mm', 150, 333.33, 50000),
  ('INV-2026-002', 'USB Cables Type C - Bulk Pack', 500, 50, 25000),
  ('INV-2026-003', 'Cotton Fabric Roll - Premium', 200, 75, 15000);

-- ── Sample Quotations ───────────────────────────────────────────
INSERT INTO quotations (id, quotation_number, client_id, subtotal, gst_rate, gst_amount, total_amount, date, valid_until, status, notes, created_by) VALUES
  (gen_random_uuid(), 'QUO-2026-001', (SELECT id FROM clients WHERE name = 'Acme Manufacturing Ltd'), 75000, 18, 13500, 88500, '2026-03-20', '2026-04-20', 'Pending', 'Quotation for large order negotiation', 'sales@crm.demo'),
  (gen_random_uuid(), 'QUO-2026-002', (SELECT id FROM clients WHERE name = 'TechTrade Enterprises'), 40000, 18, 7200, 47200, '2026-03-19', '2026-04-19', 'Accepted', 'Ready to convert to invoice', 'sales@crm.demo');

-- ── Sample Quotation Line Items ─────────────────────────────────
-- quotation_id references the UUID of the quotation; use a subquery to look up by quotation_number
INSERT INTO quotation_items (quotation_id, inventory_item_id, description, quantity, unit_price, amount)
SELECT q.id, 'INV-STEEL-001', 'Steel Coils - Hot Rolled 2mm', 225, 333.33, 75000
FROM quotations q WHERE q.quotation_number = 'QUO-2026-001';
INSERT INTO quotation_items (quotation_id, inventory_item_id, description, quantity, unit_price, amount)
SELECT q.id, 'INV-MACH-005', 'Motor Pumps 5HP - Premium Series', 40, 1000, 40000
FROM quotations q WHERE q.quotation_number = 'QUO-2026-002';

-- ── Verify Sample Data Inserted ──────────────────────────────────
-- Uncomment below to verify data (run as separate query)
-- SELECT COUNT(*) as client_count FROM clients;
-- SELECT COUNT(*) as warehouse_count FROM warehouses;
-- SELECT COUNT(*) as staff_count FROM staff;
-- SELECT COUNT(*) as inventory_count FROM inventory_items;
-- SELECT COUNT(*) as invoice_count FROM invoices;
-- SELECT COUNT(*) as quotation_count FROM quotations;
