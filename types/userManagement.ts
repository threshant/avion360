/**
 * User Management Types - For super admin to manage all users
 */

import type { Permission } from "./rbac";

export interface UserWithPermissions {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "team_lead" | "employee" | "new_user";
  phone?: string;
  telecmi_user_id?: string;
  designation?: string;
  department?: string;
  avatar_url?: string;
  employee_code?: string;
  date_of_birth?: string;
  joining_date?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  salary_amount?: number;
  salary_currency?: string;
  salary_type?: "monthly" | "hourly" | "annual" | "contract";
  payment_frequency?: string;
  payment_method?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_name?: string;
  bank_ifsc?: string;
  upi_id?: string;
  tax_id?: string;
  notes?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: "super_admin" | "admin" | "team_lead" | "employee" | "new_user";
  phone?: string;
  telecmi_user_id?: string;
  designation?: string;
  department?: string;
  employee_code?: string;
  joining_date?: string;
  salary_amount?: number;
  salary_currency?: string;
  salary_type?: "monthly" | "hourly" | "annual" | "contract";
  payment_frequency?: string;
  payment_method?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  telecmi_user_id?: string;
  designation?: string;
  department?: string;
  role?: "super_admin" | "admin" | "team_lead" | "employee" | "new_user";
  is_active?: boolean;
  employee_code?: string;
  date_of_birth?: string;
  joining_date?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  salary_amount?: number;
  salary_currency?: string;
  salary_type?: "monthly" | "hourly" | "annual" | "contract";
  payment_frequency?: string;
  payment_method?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_name?: string;
  bank_ifsc?: string;
  upi_id?: string;
  tax_id?: string;
  notes?: string;
}

export interface UpdateUserPermissionsPayload {
  userId: string;
  permissionIds: string[];
}

export interface UserPermissionAssignment {
  userId: string;
  permissionKey: string;
  hasAccess: boolean;
}
