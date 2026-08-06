-- Seed permissions for all pages in the sidebar
-- Categories: Core Access, Operations Access, Logistics Access, Financial Access

INSERT INTO permissions (key, label, description, category, order_num)
VALUES 
  -- Core Access
  ('dashboard.view', 'View Dashboard', 'Access to the main dashboard page', 'Core Access', 10),
  ('settings.view', 'View Settings', 'Access to the settings page', 'Core Access', 20),
  ('user_management.view', 'Manage All Users', 'Access to the user management page (Super Admin only)', 'Core Access', 30),
  
  -- Operations Access
  ('leads.view', 'View Leads', 'Access to the leads management page', 'Operations Access', 100),
  ('calls.view', 'View Calls', 'Access to the calls log page', 'Operations Access', 110),
  ('clients.view', 'View Customers', 'Access to the customers management page', 'Operations Access', 120),
  ('staff.view', 'View Staff', 'Access to the staff management page', 'Operations Access', 130),
  ('tasks.view', 'View Tasks', 'Access to the tasks management page', 'Operations Access', 140),
  ('reports.view', 'View Reports', 'Access to the general reports page', 'Operations Access', 150),
  
  -- Logistics Access
  ('inventory.view', 'View Inventory', 'Access to the inventory management page', 'Logistics Access', 200),
  ('stock_upload.view', 'View Stock Upload', 'Access to the stock upload page', 'Logistics Access', 210),
  ('warehouse.view', 'View Warehouse', 'Access to the warehouse management page', 'Logistics Access', 220),
  
  -- Financial Access
  ('invoices.view', 'View Invoicing', 'Access to the invoices and quotations page', 'Financial Access', 300),
  ('finance.view', 'View Finance', 'Access to the financial management page', 'Financial Access', 310),
  ('accounts.view', 'View Accounts', 'Access to the accounts page', 'Financial Access', 320),
  ('financial_reports.view', 'View Financial Reports', 'Access to detailed financial reports', 'Financial Access', 330),
  ('bank_reconciliation.view', 'View Bank Reconciliation', 'Access to the bank reconciliation page', 'Financial Access', 340),
  ('payroll.view', 'View Payroll', 'Access to the payroll management page', 'Financial Access', 350),
  ('attendance.view', 'View Attendance', 'Access to the attendance tracking page', 'Financial Access', 360)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  order_num = EXCLUDED.order_num;

-- Ensure super_admin has all permissions by default
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;
