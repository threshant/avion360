-- Grant attendance access to employees
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.key IN ('attendance.view', 'payroll.view')
WHERE r.name = 'employee'
ON CONFLICT (role_id, permission_id) DO NOTHING;
