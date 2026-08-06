"use client";

import CrmShell from "@/components/layout/CrmShell";
import { ProtectedSecretField } from "@/components/ProtectedSecretField";
import RbacManagementPanel from "@/components/settings/RbacManagementPanel";
import { useAviontiveSettings } from "@/hooks/useAviontiveSettings";
import { useMsg91Settings } from "@/hooks/useMsg91Settings";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  CodeXml,
  Copy,
  Database,
  DollarSign,
  Lock,
  Paintbrush,
  RefreshCw,
  Settings,
  ShieldPlus,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
        enabled ? "bg-[#FF6B4A]" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsTab =
  | "Profile Settings"
  | "Notifications"
  | "Security"
  | "Appearance"
  | "Integrations"
  | "API & Webhooks"
  | "Finance"
  | "Roles & Permissions";

// ─── Tab nav config ───────────────────────────────────────────────────────────

const tabs: { label: SettingsTab; icon: React.ReactNode }[] = [
  {
    label: "Profile Settings",
    icon: <UserRound className="h-5 w-5" aria-hidden="true" />,
  },
  {
    label: "Notifications",
    icon: <Bell className="h-5 w-5" aria-hidden="true" />,
  },
  {
    label: "Security",
    icon: <Lock className="h-5 w-5" aria-hidden="true" />,
  },
  {
    label: "Appearance",
    icon: <Paintbrush className="h-5 w-5" aria-hidden="true" />,
  },
  {
    label: "Integrations",
    icon: <Database className="h-5 w-5" aria-hidden="true" />,
  },
  {
    label: "API & Webhooks",
    icon: <CodeXml className="h-5 w-5" aria-hidden="true" />,
  },
  {
    label: "Finance",
    icon: <BarChart3 className="h-5 w-5" aria-hidden="true" />,
  },
  {
    label: "Roles & Permissions",
    icon: <ShieldPlus className="h-5 w-5" aria-hidden="true" />,
  },
];

// ─── Section components ───────────────────────────────────────────────────────

function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:bg-white focus:ring-2"
      />
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-base font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

function NotificationRow({
  label,
  desc,
  enabled,
  onChange,
}: {
  label: string;
  desc: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="mt-0.5 text-xs text-slate-400">{desc}</p>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTab>("Profile Settings");
  const {
    settings: aviontiveSettings,
    loading: aviontiveLoading,
    error: aviontiveError,
    saved: aviontiveSaved,
    updateSetting: updateAviontiveSetting,
  } = useAviontiveSettings();
  const {
    settings: msg91Settings,
    loading: msg91Loading,
    error: msg91Error,
    saved: msg91Saved,
    updateSetting: updateMsg91Setting,
  } = useMsg91Settings();
  const {
    profile,
    preferences,
    apiKey,
    saveProfile,
    savePreferences,
    regenerateApiKey,
  } = useUserSettings();
  const loadRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Profile
  const [firstName, setFirstName] = useState("Arjun");
  const [lastName, setLastName] = useState("Sharma");
  const [email, setEmail] = useState("arjun.sharma@avion360.com");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [department, setDepartment] = useState("Sales");
  const [saved, setSaved] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [webhookSaving, setWebhookSaving] = useState(false);

  // Notifications
  const [emailNotif, setEmailNotif] = useState(true);
  const [wpNotif, setWpNotif] = useState(true);
  const [callNotif, setCallNotif] = useState(true);
  const [leadNotif, setLeadNotif] = useState(true);

  // Security
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [twoFA, setTwoFA] = useState(false);

  // Phone OTP login (MSG91)
  const [otpLoginEnabled, setOtpLoginEnabled] = useState(false);
  const [otpLoginConfigured, setOtpLoginConfigured] = useState(false);
  const [otpLoginSaving, setOtpLoginSaving] = useState(false);
  const [otpLoginSaved, setOtpLoginSaved] = useState(false);
  const [msg91AuthKey, setMsg91AuthKey] = useState("");
  const [msg91TemplateId, setMsg91TemplateId] = useState("");
  const [msg91OtpLength, setMsg91OtpLength] = useState("6");
  const [msg91OtpExpiry, setMsg91OtpExpiry] = useState("5");
  const [msg91AuthKeyCopied, setMsg91AuthKeyCopied] = useState(false);

  // Appearance
  const [theme, setTheme] = useState<"Light" | "Dark" | "System">("Light");
  const [compactMode, setCompactMode] = useState(false);
  const [language, setLanguage] = useState("English");

  // API
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  // Finance — Credit Flow
  const [creditFlowEnabled, setCreditFlowEnabled] = useState(true);
  const [creditFlowSaving, setCreditFlowSaving] = useState(false);
  const [creditFlowSaved, setCreditFlowSaved] = useState(false);

  const {
    creditFlowEnabled: remoteCreditFlowEnabled,
    otpLoginEnabled: remoteOtpLoginEnabled,
    otpLoginConfigured: remoteOtpLoginConfigured,
    updateCreditFlow,
    updateOtpLogin,
  } = useSystemSettings();

  useEffect(() => {
    setCreditFlowEnabled(remoteCreditFlowEnabled);
  }, [remoteCreditFlowEnabled]);

  useEffect(() => {
    setOtpLoginEnabled(remoteOtpLoginEnabled);
    setOtpLoginConfigured(remoteOtpLoginConfigured);
  }, [remoteOtpLoginConfigured, remoteOtpLoginEnabled]);

  async function saveCreditFlow(val: boolean) {
    setCreditFlowSaving(true);
    setCreditFlowSaved(false);
    try {
      await updateCreditFlow(val);
      setCreditFlowEnabled(val);
      setCreditFlowSaved(true);
      setTimeout(() => setCreditFlowSaved(false), 2500);
    } finally {
      setCreditFlowSaving(false);
    }
  }

  // Aviontive Settings
  const [aviontiveApiKey, setAviontiveApiKey] = useState("");
  const [aviontiveBrandId, setAviontiveBrandId] = useState("");
  const [aviontiveBaseUrl, setAviontiveBaseUrl] = useState("");
  const [aviontiveApiKeyCopied, setAviontiveApiKeyCopied] = useState(false);
  const [aviontiveBrandIdCopied, setAviontiveBrandIdCopied] = useState(false);

  useEffect(() => {
    loadRef.current = setTimeout(() => setIsLoading(false), 900);
    return () => {
      if (loadRef.current) clearTimeout(loadRef.current);
    };
  }, []);

  // Sync Aviontive settings from hook
  useEffect(() => {
    if (!aviontiveLoading) {
      setAviontiveApiKey(aviontiveSettings.apiKey);
      setAviontiveBrandId(aviontiveSettings.brandId);
      setAviontiveBaseUrl(aviontiveSettings.apiBaseUrl);
    }
  }, [aviontiveLoading, aviontiveSettings]);

  useEffect(() => {
    if (!msg91Loading) {
      setMsg91AuthKey(msg91Settings.authKey);
      setMsg91TemplateId(msg91Settings.templateId);
      setMsg91OtpLength(msg91Settings.otpLength);
      setMsg91OtpExpiry(msg91Settings.otpExpiry);
      setOtpLoginConfigured(
        Boolean(msg91Settings.authKey && msg91Settings.templateId),
      );
    }
  }, [msg91Loading, msg91Settings]);

  useEffect(() => {
    if (!profile) return;
    const [first, ...rest] = (profile.name || "").trim().split(" ");
    setFirstName(first || "");
    setLastName(rest.join(" "));
    setEmail(profile.email || "");
    setPhone(profile.phone || "");
    setDepartment(profile.department || "Sales");
  }, [profile]);

  useEffect(() => {
    if (!preferences) return;
    setEmailNotif(preferences.emailNotif);
    setWpNotif(preferences.wpNotif);
    setCallNotif(preferences.callNotif);
    setLeadNotif(preferences.leadNotif);
    setTheme(preferences.theme);
    setCompactMode(preferences.compactMode);
    setLanguage(preferences.language);
    setWebhookUrl(preferences.webhookUrl || "");
  }, [preferences]);

  async function handleSaveProfile() {
    const fullName = `${firstName} ${lastName}`.trim();
    await saveProfile({ name: fullName, phone, department });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleSavePreferences() {
    await savePreferences({
      emailNotif,
      wpNotif,
      callNotif,
      leadNotif,
      theme,
      compactMode,
      language,
      webhookUrl,
    });
    setPreferencesSaved(true);
    setTimeout(() => setPreferencesSaved(false), 2500);
  }

  function copyApiKey() {
    navigator.clipboard.writeText(apiKey).catch(() => {});
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  }

  function copyAviontiveApiKey() {
    navigator.clipboard.writeText(aviontiveApiKey).catch(() => {});
    setAviontiveApiKeyCopied(true);
    setTimeout(() => setAviontiveApiKeyCopied(false), 2000);
  }

  function copyAviontiveBrandId() {
    navigator.clipboard.writeText(aviontiveBrandId).catch(() => {});
    setAviontiveBrandIdCopied(true);
    setTimeout(() => setAviontiveBrandIdCopied(false), 2000);
  }

  async function handleAviontiveApiKeyUpdate() {
    await updateAviontiveSetting("API_KEY", aviontiveApiKey);
  }

  async function handleAviontiveBrandIdUpdate() {
    await updateAviontiveSetting("BRAND_ID", aviontiveBrandId);
  }

  async function handleAviontiveBaseUrlUpdate() {
    await updateAviontiveSetting("API_BASE_URL", aviontiveBaseUrl);
  }

  async function saveOtpLoginEnabled(val: boolean) {
    setOtpLoginSaving(true);
    setOtpLoginSaved(false);
    try {
      await updateOtpLogin(val);
      setOtpLoginEnabled(val);
      setOtpLoginSaved(true);
      setTimeout(() => setOtpLoginSaved(false), 2500);
    } finally {
      setOtpLoginSaving(false);
    }
  }

  async function handleMsg91AuthKeyUpdate() {
    await updateMsg91Setting("authKey", msg91AuthKey);
    setOtpLoginConfigured(Boolean(msg91AuthKey && msg91TemplateId));
  }

  async function handleMsg91TemplateIdUpdate() {
    await updateMsg91Setting("templateId", msg91TemplateId);
    setOtpLoginConfigured(Boolean(msg91AuthKey && msg91TemplateId));
  }

  async function handleMsg91OtpLengthUpdate() {
    await updateMsg91Setting("otpLength", msg91OtpLength);
  }

  async function handleMsg91OtpExpiryUpdate() {
    await updateMsg91Setting("otpExpiry", msg91OtpExpiry);
  }

  function copyMsg91AuthKey() {
    navigator.clipboard.writeText(msg91AuthKey).catch(() => {});
    setMsg91AuthKeyCopied(true);
    setTimeout(() => setMsg91AuthKeyCopied(false), 2000);
  }

  const integrations = [
    {
      name: "WhatsApp Business",
      initial: "W",
      bg: "bg-emerald-500",
      status: "Connected",
    },
    {
      name: "Hikvision Access Control",
      initial: "H",
      bg: "bg-[#FF6B4A]",
      status: "Connected",
    },
    {
      name: "Twilio Voice",
      initial: "T",
      bg: "bg-slate-400",
      status: "Not Connected",
    },
    {
      name: "Razorpay",
      initial: "R",
      bg: "bg-blue-500",
      status: "Not Connected",
    },
  ];

  return (
    <CrmShell activeNav="Settings">
      <div className="space-y-5 p-4 md:p-6">
        {/* ── Page header ── */}
        <section className="rounded-3xl border border-sky-100/90 bg-white/85 p-6 shadow-sm">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <SkeletonBox className="h-9 w-9 rounded-full" />
              <div className="space-y-2">
                <SkeletonBox className="h-7 w-36 rounded-xl" />
                <SkeletonBox className="h-4 w-52 rounded-lg" />
              </div>
            </div>
          ) : (
            <div>
              <h1 className="flex items-center gap-3 text-xl font-bold text-slate-900 md:text-2xl">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FF6B4A] text-white">
                  <Settings className="h-5 w-5" aria-hidden="true" />
                </span>
                Settings
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Manage your CRM configuration
              </p>
            </div>
          )}
        </section>

        {/* ── Two-column layout ── */}
        <div className="flex gap-5 flex-col lg:flex-row">
          {/* ── Left nav panel ── */}
          {isLoading ? (
            <div className="w-full lg:w-64 shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBox key={i} className="h-11 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <nav className="w-full lg:w-64 shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm self-start">
              {tabs.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveTab(tab.label)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    activeTab === tab.label
                      ? "bg-sky-50 text-sky-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={
                      activeTab === tab.label
                        ? "text-sky-500"
                        : "text-slate-400"
                    }
                  >
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </nav>
          )}

          {/* ── Right content ── */}
          <div className="min-w-0 flex-1 space-y-5">
            {isLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <SkeletonBox className="h-6 w-40 rounded-lg" />
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <SkeletonBox className="h-4 w-24 rounded-md" />
                      <SkeletonBox className="h-10 w-full rounded-xl" />
                    </div>
                  ))}
                </div>
                <SkeletonBox className="h-10 w-32 rounded-xl" />
              </div>
            ) : (
              <>
                {/* ── Profile Settings ── */}
                {activeTab === "Profile Settings" && (
                  <SectionCard title="Profile Settings">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        label="First Name"
                        value={firstName}
                        onChange={setFirstName}
                        placeholder="First name"
                      />
                      <FormField
                        label="Last Name"
                        value={lastName}
                        onChange={setLastName}
                        placeholder="Last name"
                      />
                    </div>
                    <div className="mt-4 space-y-4">
                      <FormField
                        label="Email"
                        value={email}
                        onChange={() => undefined}
                        type="email"
                        placeholder="Email address"
                      />
                      <FormField
                        label="Phone"
                        value={phone}
                        onChange={setPhone}
                        type="tel"
                        placeholder="Phone number"
                      />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-700">
                          Department
                        </label>
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:bg-white focus:ring-2"
                        >
                          {[
                            "Sales",
                            "Marketing",
                            "Finance",
                            "HR",
                            "Operations",
                            "Support",
                          ].map((d) => (
                            <option key={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        className="flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95"
                      >
                        {saved ? (
                          <>
                            <CheckCircle2
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                            Saved!
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Email is managed by admin and cannot be edited here.
                    </p>
                  </SectionCard>
                )}

                {/* ── Notifications ── */}
                {activeTab === "Notifications" && (
                  <SectionCard title="Notification Preferences">
                    <NotificationRow
                      label="Email Notifications"
                      desc="Receive email updates for important events"
                      enabled={emailNotif}
                      onChange={setEmailNotif}
                    />
                    <NotificationRow
                      label="WhatsApp Notifications"
                      desc="Get notified for new WhatsApp messages"
                      enabled={wpNotif}
                      onChange={setWpNotif}
                    />
                    <NotificationRow
                      label="Call Notifications"
                      desc="Alerts for incoming and missed calls"
                      enabled={callNotif}
                      onChange={setCallNotif}
                    />
                    <NotificationRow
                      label="Lead Updates"
                      desc="Notifications when leads change stage"
                      enabled={leadNotif}
                      onChange={setLeadNotif}
                    />
                    <div className="mt-5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSavePreferences}
                        className="rounded-xl bg-[#FF6B4A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95"
                      >
                        Save Preferences
                      </button>
                      {preferencesSaved && (
                        <span className="text-xs font-semibold text-emerald-600">
                          Saved!
                        </span>
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* ── Security ── */}
                {activeTab === "Security" && (
                  <div className="space-y-5">
                    <SectionCard title="Change Password">
                      <div className="space-y-4">
                        <FormField
                          label="Current Password"
                          value={currentPw}
                          onChange={setCurrentPw}
                          type="password"
                          placeholder="Enter current password"
                        />
                        <FormField
                          label="New Password"
                          value={newPw}
                          onChange={setNewPw}
                          type="password"
                          placeholder="Enter new password"
                        />
                        <FormField
                          label="Confirm Password"
                          value={confirmPw}
                          onChange={setConfirmPw}
                          type="password"
                          placeholder="Confirm new password"
                        />
                      </div>
                      <button
                        type="button"
                        className="mt-5 flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95"
                      >
                        Update Password
                      </button>
                    </SectionCard>

                    <SectionCard title="Two-Factor Authentication">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Enable 2FA
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Toggle enabled={twoFA} onChange={setTwoFA} />
                      </div>
                    </SectionCard>

                    <SectionCard title="Phone OTP Login (MSG91)">
                      {msg91Error && (
                        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                          <p className="text-xs text-rose-600">{msg91Error}</p>
                        </div>
                      )}
                      {(otpLoginSaved || msg91Saved) && (
                        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                          <p className="text-xs font-semibold text-emerald-700">
                            Settings saved
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Enable phone OTP login
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Shows phone login on the sign-in page when MSG91 is
                            configured. Off by default.
                          </p>
                          {!otpLoginConfigured && (
                            <p className="mt-1 text-xs text-amber-600">
                              Save Auth Key and Template ID before enabling.
                            </p>
                          )}
                        </div>
                        <Toggle
                          enabled={otpLoginEnabled}
                          onChange={(val) => saveOtpLoginEnabled(val)}
                        />
                      </div>
                      {otpLoginSaving && (
                        <p className="text-xs text-slate-500">Saving...</p>
                      )}
                      <div className="mt-4 space-y-4">
                        <ProtectedSecretField
                          label="MSG91 Auth Key"
                          value={msg91AuthKey}
                          onChange={setMsg91AuthKey}
                          onSave={handleMsg91AuthKeyUpdate}
                          onCopy={copyMsg91AuthKey}
                          isCopied={msg91AuthKeyCopied}
                          isLoading={msg91Loading}
                          placeholder="Your MSG91 authkey"
                        />
                        <FormField
                          label="MSG91 Template ID"
                          value={msg91TemplateId}
                          onChange={setMsg91TemplateId}
                          placeholder="OTP template ID from MSG91 dashboard"
                        />
                        <button
                          type="button"
                          onClick={handleMsg91TemplateIdUpdate}
                          disabled={msg91Loading}
                          className="flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95 disabled:opacity-50"
                        >
                          Save Template ID
                        </button>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            label="OTP length"
                            value={msg91OtpLength}
                            onChange={setMsg91OtpLength}
                            placeholder="6"
                          />
                          <FormField
                            label="OTP expiry (minutes)"
                            value={msg91OtpExpiry}
                            onChange={setMsg91OtpExpiry}
                            placeholder="5"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await handleMsg91OtpLengthUpdate();
                            await handleMsg91OtpExpiryUpdate();
                          }}
                          disabled={msg91Loading}
                          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Save OTP options
                        </button>
                      </div>
                      <p className="mt-4 text-xs text-slate-500">
                        Users must have a matching phone number on their CRM
                        account. Env fallbacks: MSG91_AUTH_KEY,
                        MSG91_TEMPLATE_ID, OTP_LOGIN_ENABLED.
                      </p>
                    </SectionCard>
                  </div>
                )}

                {/* ── Appearance ── */}
                {activeTab === "Appearance" && (
                  <div className="space-y-5">
                    <SectionCard title="Theme">
                      <div className="flex flex-wrap gap-3">
                        {(["Light", "Dark", "System"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTheme(t)}
                            className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition ${
                              theme === t
                                ? "border-sky-300 bg-sky-50 text-sky-600"
                                : "border-slate-200 bg-white text-slate-600 hover:border-sky-200"
                            }`}
                          >
                            {t === "Light" && "☀️ Light"}
                            {t === "Dark" && "🌙 Dark"}
                            {t === "System" && "💻 System"}
                          </button>
                        ))}
                      </div>
                    </SectionCard>

                    <SectionCard title="Display">
                      <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-semibold text-slate-700">
                            Language
                          </label>
                          <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:bg-white focus:ring-2"
                          >
                            {[
                              "English",
                              "Hindi",
                              "Tamil",
                              "Telugu",
                              "Marathi",
                            ].map((l) => (
                              <option key={l}>{l}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              Compact Mode
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              Reduce spacing for denser layout
                            </p>
                          </div>
                          <Toggle
                            enabled={compactMode}
                            onChange={setCompactMode}
                          />
                        </div>
                      </div>
                      <div className="mt-5 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleSavePreferences}
                          className="rounded-xl bg-[#FF6B4A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95"
                        >
                          Save Display Settings
                        </button>
                        {preferencesSaved && (
                          <span className="text-xs font-semibold text-emerald-600">
                            Saved!
                          </span>
                        )}
                      </div>
                    </SectionCard>
                  </div>
                )}

                {/* ── Integrations ── */}
                {activeTab === "Integrations" && (
                  <SectionCard title="Integrations">
                    <div className="space-y-3">
                      {integrations.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3.5"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white ${item.bg}`}
                            >
                              {item.initial}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {item.name}
                              </p>
                              <p
                                className={`mt-0.5 text-xs font-medium ${
                                  item.status === "Connected"
                                    ? "text-emerald-600"
                                    : "text-slate-400"
                                }`}
                              >
                                {item.status}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                              item.status === "Connected"
                                ? "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-600"
                                : "border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100"
                            }`}
                          >
                            {item.status === "Connected"
                              ? "Configure"
                              : "Connect"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* ── API & Webhooks ── */}
                {activeTab === "API & Webhooks" && (
                  <div className="space-y-5">
                    <SectionCard title="Aviontive API Configuration">
                      {aviontiveError && (
                        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                          <p className="text-xs text-rose-600">
                            {aviontiveError}
                          </p>
                        </div>
                      )}
                      {aviontiveSaved && (
                        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                          <p className="flex items-center gap-2 text-xs text-emerald-600">
                            <CheckCircle2
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                            Settings saved successfully
                          </p>
                        </div>
                      )}
                      <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-semibold text-slate-700">
                            API Base URL
                          </label>
                          <input
                            type="url"
                            value={aviontiveBaseUrl}
                            onChange={(e) =>
                              setAviontiveBaseUrl(e.target.value)
                            }
                            placeholder="https://box.aviontive.com/api"
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:bg-white focus:ring-2"
                          />
                          <button
                            type="button"
                            onClick={handleAviontiveBaseUrlUpdate}
                            disabled={aviontiveLoading}
                            className="mt-2 flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95 disabled:opacity-50"
                          >
                            Save Base URL
                          </button>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-semibold text-slate-700">
                            API Key
                          </label>
                          <ProtectedSecretField
                            label=""
                            value={aviontiveApiKey}
                            onChange={setAviontiveApiKey}
                            onSave={handleAviontiveApiKeyUpdate}
                            onCopy={copyAviontiveApiKey}
                            isCopied={aviontiveApiKeyCopied}
                            isLoading={aviontiveLoading}
                            placeholder="Enter your Aviontive API key"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-semibold text-slate-700">
                            Brand ID
                          </label>
                          <ProtectedSecretField
                            label=""
                            value={aviontiveBrandId}
                            onChange={setAviontiveBrandId}
                            onSave={handleAviontiveBrandIdUpdate}
                            onCopy={copyAviontiveBrandId}
                            isCopied={aviontiveBrandIdCopied}
                            isLoading={aviontiveLoading}
                            placeholder="Enter your Aviontive Brand ID (UUID)"
                          />
                        </div>
                      </div>
                      <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
                        <p className="text-xs text-sky-700">
                          <strong>Note:</strong> Changes to API configuration
                          will take effect in real-time across the application.
                        </p>
                      </div>
                    </SectionCard>

                    <SectionCard title="API Key">
                      <p className="mb-3 text-xs text-slate-400">
                        Use this key to authenticate API requests. Keep it
                        secret.
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-700">
                          {apiKey}
                        </div>
                        <button
                          type="button"
                          onClick={copyApiKey}
                          className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                            apiKeyCopied
                              ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                              : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-600"
                          }`}
                        >
                          {apiKeyCopied ? (
                            <>
                              <CheckCircle2
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" aria-hidden="true" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          setApiKeySaving(true);
                          try {
                            await regenerateApiKey();
                          } finally {
                            setApiKeySaving(false);
                          }
                        }}
                        disabled={apiKeySaving}
                        className="mt-3 flex items-center gap-2 text-xs font-semibold text-rose-500 transition hover:text-rose-600"
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        {apiKeySaving ? "Regenerating..." : "Regenerate Key"}
                      </button>
                    </SectionCard>

                    <SectionCard title="Webhook URL">
                      <p className="mb-3 text-xs text-slate-400">
                        Receive real-time event notifications at your endpoint.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder="https://your-domain.com/webhook"
                          className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:bg-white focus:ring-2"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            setWebhookSaving(true);
                            try {
                              await handleSavePreferences();
                            } finally {
                              setWebhookSaving(false);
                            }
                          }}
                          className="flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95"
                        >
                          {webhookSaving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </SectionCard>
                  </div>
                )}

                {/* ── Finance (Super Admin) ── */}
                {activeTab === "Finance" && (
                  <SectionCard title="Finance Controls">
                    <div className="space-y-5">
                      {/* Credit Flow toggle */}
                      <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                              <DollarSign
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </span>
                            <p className="text-sm font-semibold text-slate-900">
                              Credit Flow
                            </p>
                            {creditFlowSaved && (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                Saved ✓
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-xs text-slate-500 max-w-sm">
                            When enabled, the Finance page shows an{" "}
                            <strong>Add Cash Balance</strong> button.
                            Cash-credit entries appear in transaction history
                            and are included in total income. Disabling hides
                            all credit entries everywhere.
                          </p>
                          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                            <AlertTriangle
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Super Admin only — affects all users immediately.
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Toggle
                            enabled={creditFlowEnabled}
                            onChange={(v) => {
                              if (!creditFlowSaving) saveCreditFlow(v);
                            }}
                          />
                          <span
                            className={`text-xs font-semibold ${creditFlowEnabled ? "text-emerald-600" : "text-slate-400"}`}
                          >
                            {creditFlowSaving
                              ? "Saving…"
                              : creditFlowEnabled
                                ? "Enabled"
                                : "Disabled"}
                          </span>
                        </div>
                      </div>

                      {/* Status callout */}
                      <div
                        className={`rounded-2xl border p-4 text-sm ${creditFlowEnabled ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                      >
                        <p
                          className={`font-medium ${creditFlowEnabled ? "text-emerald-700" : "text-slate-600"}`}
                        >
                          {creditFlowEnabled
                            ? "✓ Credit flow is active — cash balance entries are visible and counted in totals."
                            : "✗ Credit flow is disabled — cash balance entries are hidden from Finance page and totals."}
                        </p>
                      </div>
                    </div>
                  </SectionCard>
                )}

                {activeTab === "Roles & Permissions" && <RbacManagementPanel />}
              </>
            )}
          </div>
        </div>
      </div>
    </CrmShell>
  );
}
