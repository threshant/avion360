"use client";

import UniversalNetworkLoader from "@/components/layout/UniversalNetworkLoader";
import { PermissionDeniedModal } from "@/components/PermissionDeniedModal";
import { useUserPermissions } from "@/hooks/useRBAC";
import { useAuth } from "@/lib/auth-context";
import {
  Activity,
  ArrowLeftRight,
  Banknote,
  BarChart3,
  BarChart4,
  Briefcase,
  Building2,
  CalendarDays,
  CircleAlert,
  ClipboardList,
  Clock3,
  DollarSign,
  FileText,
  House,
  Landmark,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Package,
  Phone,
  PieChart,
  Receipt,
  Settings,
  Shield,
  Ticket,
  TrendingUp,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

// ─── Nav ──────────────────────────────────────────────────────────────────────

type NavIcon =
  | "home"
  | "pulse"
  | "users"
  | "trend"
  | "calendar"
  | "chat"
  | "phone"
  | "mail"
  | "clock"
  | "dollar"
  | "box"
  | "finance"
  | "invoice"
  | "quotation"
  | "proforma"
  | "reports"
  | "settings"
  | "accounts"
  | "payments"
  | "chart"
  | "bank"
  | "clients"
  | "vendors"
  | "employees"
  | "ticket";

type NavItem = {
  label: string;
  href: string;
  icon: NavIcon;
  permissionKey?: string;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "Home",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: "home",
        permissionKey: "dashboard",
      },
      {
        label: "My Tasks",
        href: "/tasks",
        icon: "clock",
        permissionKey: "tasks",
      },
    ],
  },
  {
    label: "Leads",
    items: [
      { label: "Leads", href: "/leads", icon: "trend", permissionKey: "leads" },
      {
        label: "Conversations",
        href: "/conversations",
        icon: "users",
        permissionKey: "leads",
      },
      { label: "Calls", href: "/calls", icon: "phone", permissionKey: "calls" },
    ],
  },
  {
    label: "Support",
    items: [
      {
        label: "Tickets",
        href: "/tickets",
        icon: "ticket",
        permissionKey: undefined,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Inventory",
        href: "/inventory",
        icon: "box",
        permissionKey: "inventory",
      },
      {
        label: "Warehouse",
        href: "/warehouse",
        icon: "bank",
        permissionKey: "warehouse",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Invoices",
        href: "/invoicing",
        icon: "invoice",
        permissionKey: "invoices",
      },
      {
        label: "Quotations",
        href: "/quotations",
        icon: "quotation",
        permissionKey: "quotations",
      },
      {
        label: "Proforma",
        href: "/proforma",
        icon: "proforma",
        permissionKey: undefined,
      },
      {
        label: "Expenses",
        href: "/expenses",
        icon: "finance",
        permissionKey: "finance",
      },
      {
        label: "Finance",
        href: "/finance",
        icon: "chart",
        permissionKey: "finance",
      },
      {
        label: "Accounts",
        href: "/accounts",
        icon: "accounts",
        permissionKey: "accounts",
      },
      {
        label: "Payments",
        href: "/payments",
        icon: "payments",
        permissionKey: "invoices",
      },
    ],
  },
  {
    label: "HR",
    items: [
      {
        label: "Attendance",
        href: "/attendance",
        icon: "calendar",
        permissionKey: "attendance",
      },
      {
        label: "Payroll",
        href: "/payroll",
        icon: "dollar",
        permissionKey: undefined,
      },
    ],
  },
  {
    label: "Directory",
    items: [
      {
        label: "Clients",
        href: "/customers",
        icon: "clients",
        permissionKey: undefined,
      },
      {
        label: "Vendors",
        href: "/people",
        icon: "vendors",
        permissionKey: undefined,
      },
      {
        label: "Employees",
        href: "/staff",
        icon: "employees",
        permissionKey: undefined,
      },
      {
        label: "Users",
        href: "/settings/users",
        icon: "users",
        permissionKey: undefined,
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        label: "Reports",
        href: "/reports",
        icon: "reports",
        permissionKey: "reports",
      },
    ],
  },
];

// ─── Icons ────────────────────────────────────────────────────────────────────

function NavIconSvg({
  name,
  className,
}: {
  name: NavIcon;
  className?: string;
}) {
  const navIconMap: Record<NavIcon, LucideIcon> = {
    home: House,
    pulse: Activity,
    users: Users,
    trend: TrendingUp,
    calendar: CalendarDays,
    chat: MessageCircle,
    phone: Phone,
    mail: Mail,
    clock: Clock3,
    dollar: DollarSign,
    box: Package,
    finance: BarChart3,
    invoice: FileText,
    quotation: ClipboardList,
    proforma: Receipt,
    reports: PieChart,
    settings: Settings,
    accounts: ArrowLeftRight,
    payments: Banknote,
    chart: BarChart4,
    bank: Landmark,
    clients: Building2,
    vendors: Briefcase,
    employees: UserRound,
    ticket: Ticket,
  };
  const Icon = navIconMap[name] ?? Shield;
  return <Icon className={className ?? "h-5 w-5"} aria-hidden="true" />;
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function NavSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="space-y-1 px-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-lg bg-gray-100 ${
            collapsed ? "h-9 w-9" : "h-9"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export default function CrmShell({
  children,
  activeNav,
}: {
  children: ReactNode;
  activeNav?: string;
}) {
  const router = useRouter();
  const { logout, user, memberships, activeTenantId, switchTenant } = useAuth();
  const { permissions, loading: permissionsLoading } = useUserPermissions();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSwitchingTenant, setIsSwitchingTenant] = useState(false);
  const [deniedModal, setDeniedModal] = useState<{
    isOpen: boolean;
    featureName: string;
    permission: string;
  }>({ isOpen: false, featureName: "", permission: "" });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
        setIsUserMenuOpen(false);
      }
    }

    function handleClickOutside(event: MouseEvent) {
      if (isUserMenuOpen) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileSidebarOpen]);

  // Check if user has permission for a specific nav item
  const hasPermissionForItem = (item: NavItem): boolean => {
    if (!item.permissionKey) return true; // No permission required

    // For nav items, require the specific .view permission (e.g., inventory.view, not just inventory.create)
    const requiredPermission = `${item.permissionKey}.view`;
    const userPermissionKeys = new Set(permissions.map((p) => p.key));

    // Check if user has the specific view permission
    return userPermissionKeys.has(requiredPermission);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleTenantChange = async (tenantId: string) => {
    if (!tenantId || tenantId === activeTenantId) {
      return;
    }
    try {
      setIsSwitchingTenant(true);
      await switchTenant(tenantId);
      router.refresh();
    } finally {
      setIsSwitchingTenant(false);
    }
  };

  // Handle navigation with permission check
  const handleNavClick = (item: NavItem) => {
    if (!hasPermissionForItem(item)) {
      setDeniedModal({
        isOpen: true,
        featureName: item.label,
        permission: `${item.permissionKey} access`,
      });
      return;
    }
    setIsMobileSidebarOpen(false);
    router.push(item.href);
  };

  const renderNavItem = (item: NavItem, collapsed = false, mobile = false) => {
    const hasPermission = hasPermissionForItem(item);
    const active = activeNav === item.label;

    if (hasPermission) {
      return (
        <Link
          key={item.label}
          href={item.href}
          onClick={() => mobile && setIsMobileSidebarOpen(false)}
          className={`flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition ${
            active
              ? "bg-[#FF6B4A] text-white"
              : "text-[#6B7280] hover:bg-gray-100 hover:text-[#1A1A1A]"
          } ${collapsed ? "justify-center px-2" : "px-3"}`}
        >
          <NavIconSvg name={item.icon} className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{item.label}</span>}
        </Link>
      );
    }

    return (
      <button
        key={item.label}
        onClick={() => handleNavClick(item)}
        className={`flex w-full cursor-not-allowed items-center gap-3 rounded-lg py-2 text-sm font-medium transition ${
          collapsed ? "justify-center px-2" : "px-3"
        } text-[#6B7280]/50 hover:bg-red-50 hover:text-red-400`}
        title={`You don't have permission to access ${item.label}`}
      >
        <NavIconSvg name={item.icon} className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span>{item.label}</span>
            <CircleAlert
              className="ml-auto h-3.5 w-3.5 opacity-50"
              aria-hidden="true"
            />
          </>
        )}
      </button>
    );
  };

  const settingsItem = {
    label: "Settings",
    href: "/settings",
    icon: "settings" as const,
    permissionKey: "settings",
  };

  return (
    <main className="relative min-h-screen bg-[#F6F6F4] text-[#1A1A1A]">
      <UniversalNetworkLoader />

      <div className="flex min-h-screen w-full">
        <div
          className={`fixed inset-0 z-30 bg-[#1A1A1A]/40 transition-opacity duration-300 lg:hidden ${
            isMobileSidebarOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />

        <aside
          className={`fixed inset-y-3 left-3 z-40 flex w-[min(18rem,85vw)] flex-col rounded-3xl bg-white p-3 shadow-lg transition-transform duration-300 lg:hidden ${
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-label="Mobile navigation"
        >
          <div className="mb-4 flex items-center justify-between gap-3 px-2 py-2">
            <p className="text-sm font-bold text-[#1A1A1A]">Sourcersbiz CRM</p>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close navigation"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:bg-gray-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <nav className="crm-sidebar-scroll flex-1 space-y-1 overflow-y-auto">
            {permissionsLoading ? (
              <NavSkeleton collapsed={false} />
            ) : (
              navSections.map((section) => (
                <div key={section.label} className="space-y-0.5">
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                    {section.label}
                  </p>
                  {section.items.map((item) =>
                    renderNavItem(item, false, true),
                  )}
                </div>
              ))
            )}
          </nav>

          <div className="mt-2 border-t border-[#E5E7EB] pt-2">
            <div className="relative mt-2 border-t border-[#E5E7EB] pt-2">
              {user && (
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-gray-50"
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF1EE] text-[#FF6B4A]">
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-xs font-medium text-[#1A1A1A]">
                      {user.name}
                    </p>
                    <p className="truncate text-[10px] text-[#6B7280]">
                      {user.email}
                    </p>
                  </div>
                </button>
              )}

              {isUserMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-lg">
                  {memberships.length > 1 && (
                    <div className="border-b border-[#E5E7EB] px-4 py-2.5">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                        Organization
                      </p>
                      <select
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-2 py-1.5 text-xs text-[#1A1A1A]"
                        value={activeTenantId ?? ""}
                        onChange={(event) => {
                          void handleTenantChange(event.target.value);
                        }}
                        disabled={isSwitchingTenant}
                      >
                        {memberships.map((membership) => (
                          <option
                            key={membership.id}
                            value={membership.tenantId}
                          >
                            {membership.organizationName} ({membership.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {hasPermissionForItem(settingsItem) && (
                    <Link
                      href="/settings"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#1A1A1A] transition hover:bg-gray-50"
                    >
                      <NavIconSvg
                        name="settings"
                        className="h-4 w-4 shrink-0"
                      />
                      Settings
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Sidebar ── */}
        <aside
          className={`hidden shrink-0 rounded-3xl bg-white shadow-sm transition-[width] duration-300 lg:sticky lg:top-3 lg:mb-3 lg:ml-3 lg:flex lg:h-[calc(100vh-1.5rem)] lg:flex-col ${
            isSidebarCollapsed ? "w-16" : "w-[240px]"
          } py-3`}
        >
          {/* Logo / header */}
          <div
            className={`mb-4 flex items-center gap-2 py-2 ${isSidebarCollapsed ? "px-2" : "px-3"}`}
          >
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              aria-label={
                isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:bg-gray-50"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            {!isSidebarCollapsed && (
              <p className="text-sm font-bold text-[#1A1A1A]">
                Sourcersbiz CRM
              </p>
            )}
          </div>

          {/* Nav items */}
          <nav
            className={`crm-sidebar-scroll flex-1 space-y-1 overflow-y-auto ${isSidebarCollapsed ? "px-2" : "px-3"}`}
          >
            {permissionsLoading ? (
              <NavSkeleton collapsed={isSidebarCollapsed} />
            ) : (
              navSections.map((section) => (
                <div key={section.label} className="space-y-0.5">
                  {!isSidebarCollapsed && (
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                      {section.label}
                    </p>
                  )}
                  {section.items.map((item) =>
                    renderNavItem(item, isSidebarCollapsed, false),
                  )}
                </div>
              ))
            )}
          </nav>

          {/* ── Bottom: User menu ── */}
          <div
            className={`relative mt-auto border-t border-[#E5E7EB] pt-2 ${isSidebarCollapsed ? "px-2" : "px-3"}`}
          >
            {user && (
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className={`flex w-full items-center gap-2 rounded-lg py-2 transition hover:bg-gray-50 ${
                  isSidebarCollapsed ? "justify-center" : "px-2"
                }`}
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF1EE] text-[#FF6B4A]">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                </span>
                {!isSidebarCollapsed && (
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-xs font-medium text-[#1A1A1A]">
                      {user.name}
                    </p>
                    <p className="truncate text-[10px] text-[#6B7280]">
                      {user.email}
                    </p>
                  </div>
                )}
              </button>
            )}

            {isUserMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-lg">
                {memberships.length > 1 && (
                  <div className="border-b border-[#E5E7EB] px-4 py-2.5">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Organization
                    </p>
                    <select
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-2 py-1.5 text-xs text-[#1A1A1A]"
                      value={activeTenantId ?? ""}
                      onChange={(event) => {
                        void handleTenantChange(event.target.value);
                      }}
                      disabled={isSwitchingTenant}
                    >
                      {memberships.map((membership) => (
                        <option key={membership.id} value={membership.tenantId}>
                          {membership.organizationName} ({membership.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {hasPermissionForItem(settingsItem) && (
                  <Link
                    href="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#1A1A1A] transition hover:bg-gray-50"
                  >
                    <NavIconSvg name="settings" className="h-4 w-4 shrink-0" />
                    Settings
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main ── */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Page content */}
          {children}
        </section>
      </div>

      {/* Permission Denied Modal */}
      <PermissionDeniedModal
        isOpen={deniedModal.isOpen}
        onClose={() =>
          setDeniedModal({ isOpen: false, featureName: "", permission: "" })
        }
        featureName={deniedModal.featureName}
        requiredPermission={deniedModal.permission}
      />
    </main>
  );
}
