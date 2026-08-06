"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/lib/auth-context";
import {
    Bell,
    LogOut,
    Menu,
    MessageSquareText,
    Search,
    Settings,
    Shield,
    UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function TopAction({ badge, icon }: { badge?: number; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-white text-slate-600 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
    >
      {icon}
      {badge && (
        <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

export default function Header() {
  const router = useRouter();
  const { logout, user, loading } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const userButtonRef = useRef<HTMLButtonElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loading: notificationsLoading,
  } = useNotifications(8);

  useEffect(() => {
    if (isUserMenuOpen && userButtonRef.current) {
      const rect = userButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isUserMenuOpen]);

  // Debug: Log current user
  useEffect(() => {
    if (user) {
      console.log("[DEBUG] User currently logged in:", {
        name: user.name,
        email: user.email,
        role: user.role,
        id: user.id,
      });
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-10 border-b border-sky-100/70 bg-white/75 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-white text-slate-600 shadow-sm lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Search */}
        <div className="relative w-full max-w-2xl">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search className="h-5 w-5" aria-hidden="true" />
          </span>
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-xl border border-sky-100 bg-white px-4 py-2.5 pl-10 text-sm placeholder-slate-400 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-white text-slate-600 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-2xl shadow-sky-900/15">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Notifications
                  </h3>
                  <button
                    type="button"
                    onClick={() => markAllAsRead()}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notificationsLoading ? (
                    <p className="px-4 py-3 text-sm text-slate-500">
                      Loading...
                    </p>
                  ) : notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">
                      No notifications yet.
                    </p>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => markAsRead(notification.id)}
                        className={`w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${notification.is_read ? "bg-white" : "bg-sky-50/40"}`}
                      >
                        <p className="text-sm font-semibold text-slate-800">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Messages */}
          <TopAction
            badge={5}
            icon={
              <MessageSquareText className="h-5 w-5" aria-hidden="true" />
            }
          />
          {/* Settings */}
          <Link
            href="/settings"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-white text-slate-600 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </Link>

          {/* User menu */}
          <div
            className="relative ml-1 flex items-center gap-2"
            ref={userMenuRef}
          >
            <button
              ref={userButtonRef}
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-haspopup="dialog"
              aria-expanded={isUserMenuOpen}
              disabled={loading && !user}
              className="flex items-center gap-2 rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 disabled:opacity-70"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-sky-200 to-cyan-100 text-sky-700">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </span>
              {loading && !user ? (
                <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
              ) : (
                <div className="flex flex-col items-start leading-tight">
                  <span className="block text-slate-800">{user?.name}</span>
                  <span className="block text-[10px] font-medium text-slate-500">
                    {user?.email}
                  </span>
                </div>
              )}
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* User menu dropdown */}
            {isUserMenuOpen && (
              <div
                role="dialog"
                aria-label="User menu"
                className="fixed z-100 w-72 overflow-hidden rounded-2xl border border-sky-100 bg-white/95 shadow-2xl shadow-sky-900/15 backdrop-blur"
                style={{
                  top: `${menuPosition.top}px`,
                  right: `${menuPosition.right}px`,
                }}
              >
                {loading && !user ? (
                  <div className="border-b border-sky-100 px-4 py-4">
                    <div className="mb-2 h-6 w-24 animate-pulse rounded bg-slate-200" />
                    <div className="mb-2 h-7 w-32 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                  </div>
                ) : (
                  <div className="border-b border-sky-100 px-4 py-4">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-linear-to-r from-sky-600 to-cyan-500 px-3 py-1 text-xs font-bold text-white">
                      <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                      {user?.role === "super_admin"
                        ? "Super Admin"
                        : user?.role === "admin"
                          ? "Admin"
                          : user?.role === "team_lead"
                            ? "Team Lead"
                            : user?.role === "employee"
                              ? "Employee"
                              : "New User"}
                    </div>
                    <p className="text-lg font-bold text-slate-900">
                      {user?.name}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {user?.email}
                    </p>
                  </div>
                )}

                <div className="py-2">
                  <button
                    type="button"
                    className="flex w-full items-center px-4 py-2.5 text-left text-[17px] font-medium text-slate-700 transition hover:bg-sky-50"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center px-4 py-2.5 text-left text-[17px] font-medium text-slate-700 transition hover:bg-sky-50"
                  >
                    Account Settings
                  </button>
                </div>

                <div className="border-t border-sky-100 px-2 py-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[17px] font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut className="h-5 w-5 text-slate-400" aria-hidden="true" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
