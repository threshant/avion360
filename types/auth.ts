export type UserRole = "super_admin" | "admin" | "team_lead" | "employee";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId?: string | null;
  department?: string;
  designation?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string; // ISO date string
  lastLogin: string; // ISO date string
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: User;
  tenantId?: string | null;
  expiresAt: string; // ISO date string
};

export type UpdateProfilePayload = Partial<
  Pick<User, "name" | "phone" | "designation" | "avatarUrl">
>;

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type SignupPayload = {
  name: string;
  email: string;
  password: string;
  organizationName: string;
  teamSize: number;
  industry: string;
  companyWebsite?: string;
  planTier?: string;
};
