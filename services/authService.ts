import type {
  ChangePasswordPayload,
  LoginPayload,
  LoginResponse,
  UpdateProfilePayload,
  User,
} from "@/types/auth";
import { api } from "./apiClient";

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return api.post<LoginResponse>("/api/auth/login", payload);
}

export async function loginWithToken(token: string): Promise<LoginResponse> {
  return api.post<LoginResponse>("/api/auth/token-login", { token });
}

export async function logout(): Promise<void> {
  return api.post<void>("/api/auth/logout", {});
}

export async function fetchCurrentUser(signal?: AbortSignal): Promise<User> {
  return api.get<User>("/api/auth/me", undefined, signal);
}

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<User> {
  return api.patch<User>("/api/auth/me", payload);
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<void> {
  return api.post<void>("/api/auth/change-password", payload);
}

export async function signup(payload: {
  name: string;
  email: string;
  password: string;
  role: string;
  masterPin: string;
  organizationName?: string;
  planTier?: string;
}): Promise<LoginResponse> {
  return api.post<LoginResponse>("/api/auth/signup", payload);
}

export type OtpLoginStatus = {
  enabled: boolean;
  configured: boolean;
  active: boolean;
};

export async function fetchOtpLoginStatus(): Promise<OtpLoginStatus> {
  return api.get<OtpLoginStatus>("/api/auth/otp-login/status");
}

export async function sendOtp(phone: string): Promise<{
  message: string;
  retryAfterSeconds?: number;
}> {
  return api.post<{ message: string; retryAfterSeconds?: number }>(
    "/api/auth/otp/send",
    { phone },
  );
}

export async function verifyOtpLogin(
  phone: string,
  otp: string,
): Promise<LoginResponse> {
  return api.post<LoginResponse>("/api/auth/otp/verify", { phone, otp });
}
