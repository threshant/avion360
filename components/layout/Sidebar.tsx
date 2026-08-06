"use client";

import { useAuth } from "@/lib/auth-context";
import { usePermissionsCache } from "@/lib/permissions-context";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CircleAlert,
  Clock3,
  DollarSign,
  FileText,
  House,
  Mail,
  Menu,
  MessageCircle,
  Package,
  Phone,
  PieChart,
  Settings,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useMemo, useState } from "react";

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
  | "reports"
  | "settings";

type NavItem = {
  label: string;
  href: string;
  icon: NavIcon;
  permissionKey?: string;
};

const allNavItems: NavItem[] = [
  {
    label: "My Tasks",
    href: "/tasks",
    icon: "clock",
    permissionKey: undefined,
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "home",
    permissionKey: undefined,
  },
  {
    label: "Leads",
    href: "/conversations",
    icon: "users",
    permissionKey: "leads",
  },
  { label: "Calls", href: "/calls", icon: "phone", permissionKey: undefined },
  {
    label: "People",
    href: "/people",
    icon: "users",
    permissionKey: undefined,
  },
  {
    label: "Attendance",
    href: "/attendance",
    icon: "clock",
    permissionKey: undefined,
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: "box",
    permissionKey: "inventory",
  },
  {
    label: "Warehouse",
    href: "/warehouse",
    icon: "box",
    permissionKey: "warehouse",
  },
  {
    label: "Invoicing",
    href: "/invoicing",
    icon: "invoice",
    permissionKey: "invoices",
  },
  {
    label: "Finance",
    href: "/finance",
    icon: "finance",
    permissionKey: undefined,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: "reports",
    permissionKey: "reports",
  },
];

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
    reports: PieChart,
    settings: Settings,
  };
  const Icon = navIconMap[name] ?? Activity;
  return <Icon className={className ?? "h-5 w-5"} aria-hidden="true" />;
}

// Memoized nav items component - doesn't re-render on pathname changes
const NavItems = memo(
  ({
    collapsed,
    isActive,
    hasPermissionForItem,
  }: {
    collapsed: boolean;
    isActive: (href: string) => boolean;
    hasPermissionForItem: (item: NavItem) => boolean;
  }) => {
    return (
      <>
        {allNavItems.map((item) => {
          const hasPermission = hasPermissionForItem(item);

          if (hasPermission) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group flex items-center gap-3 rounded-2xl py-3 text-[15px] font-semibold transition ${
                  isActive(item.href)
                    ? "bg-white/20 text-white shadow-lg shadow-sky-950/30"
                    : "text-sky-100 hover:bg-white/12 hover:text-white"
                } ${collapsed ? "justify-center px-2" : "px-4"}`}
              >
                <NavIconSvg name={item.icon} className="h-5 w-5" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          }

          return (
            <button
              key={item.label}
              disabled
              className={`group flex w-full items-center gap-3 rounded-2xl py-3 text-[15px] font-semibold transition cursor-not-allowed ${
                collapsed ? "justify-center px-2" : "px-4"
              } relative text-sky-300/60 hover:bg-red-800/20 hover:text-red-300/80`}
              title={`You don't have permission to access ${item.label}`}
            >
              <NavIconSvg name={item.icon} className="h-5 w-5" />
              {!collapsed && (
                <>
                  <span>{item.label}</span>
                  <CircleAlert
                    className="ml-auto h-4 w-4 opacity-50"
                    aria-hidden="true"
                  />
                </>
              )}
            </button>
          );
        })}
      </>
    );
  },
);

NavItems.displayName = "NavItems";

export default function Sidebar() {
  const { user } = useAuth();
  const { permissions } = usePermissionsCache();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  const hasPermissionForItem = useMemo(
    () =>
      (item: NavItem): boolean => {
        if (!item.permissionKey) return true;
        const requiredPermission = `${item.permissionKey}.view`;
        const userPermissionKeys = new Set(permissions.map((p) => p.key));
        return userPermissionKeys.has(requiredPermission);
      },
    [permissions],
  );

  const isActive = useMemo(
    () =>
      (href: string): boolean => {
        return pathname === href || pathname.startsWith(href + "/");
      },
    [pathname],
  );

  return (
    <aside
      className={`hidden shrink-0 border-r border-sky-200/60 bg-gradient-to-b from-slate-900 via-sky-900 to-cyan-900 text-sky-50 transition-[width,padding] duration-300 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col ${
        isSidebarCollapsed ? "w-24 p-3" : "w-72 p-4"
      }`}
    >
      <div className="mb-5 flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          aria-label={
            isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/10 text-sky-100 transition hover:bg-white/20"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        {!isSidebarCollapsed && (
          <div>
            <p className="text-lg font-bold">Avion360</p>
            <p className="text-xs text-sky-200">Control Center</p>
          </div>
        )}
      </div>

      <nav className="crm-sidebar-scroll flex-1 space-y-1.5 overflow-y-auto pr-1">
        {allNavItems.length === 0 ? (
          <div className="px-4 py-3 text-sm text-sky-200">
            No menu items available
          </div>
        ) : (
          <NavItems
            collapsed={isSidebarCollapsed}
            isActive={isActive}
            hasPermissionForItem={hasPermissionForItem}
          />
        )}
      </nav>

      {/* Settings section */}
      <div
        className={`mt-3 border-t border-white/10 pt-3 ${isSidebarCollapsed ? "px-1" : "px-1"}`}
      >
        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-2xl py-3 text-[15px] font-semibold transition ${
            isActive("/settings")
              ? "bg-white/20 text-white shadow-lg shadow-sky-950/30"
              : "text-sky-100 hover:bg-white/12 hover:text-white"
          } ${isSidebarCollapsed ? "justify-center px-2" : "px-4"}`}
        >
          <NavIconSvg name="settings" className="h-5 w-5 shrink-0" />
          {!isSidebarCollapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
