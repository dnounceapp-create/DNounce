"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  LayoutDashboard, FileText, Users, Ticket, Flag,
  Bell, Award, ScrollText, LogOut, Shield, ChevronRight, Menu, X,
  BarChart2, Search
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/search", label: "Global Search", icon: Search },
  { href: "/admin/records", label: "Records", icon: FileText },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/tickets", label: "Support Tickets", icon: Ticket },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/notifications", label: "Notifications Log", icon: Bell },
  { href: "/admin/badges", label: "Badges", icon: Award },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

const LEVEL_LABELS: Record<string, string> = {
  support_agent: "Support Agent",
  moderator: "Moderator",
  super_admin: "Super Admin",
};

const LEVEL_COLORS: Record<string, string> = {
  support_agent: "bg-blue-100 text-blue-800",
  moderator: "bg-purple-100 text-purple-800",
  super_admin: "bg-red-100 text-red-800",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminLevel, setAdminLevel] = useState<string>("");
  const [adminName, setAdminName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push("/loginsignup"); return; }

      const { data: role } = await supabase
        .from("admin_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!role?.role) { router.push("/dashboard"); return; }

      const { data: acct } = await supabase
        .from("user_accountdetails")
        .select("first_name, last_name")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setAdminLevel(role.role);

      setAdminName(`${acct?.first_name ?? ""} ${acct?.last_name ?? ""}`.trim() || session.user.email || "Admin");
      setLoading(false);
    }
    check();
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/loginsignup");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Verifying access…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-200 ${menuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-800">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
            <Shield className="w-4 h-4 text-gray-900" />
          </div>
          <div>
            <div className="text-white text-sm font-semibold leading-tight">DNounce</div>
            <div className="text-gray-500 text-[10px]">Admin Panel</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-white text-gray-900"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {active && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-800 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-semibold">
              {adminName[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-medium truncate">{adminName}</div>
              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[adminLevel]}`}>
                {LEVEL_LABELS[adminLevel]}
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 text-sm transition"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMenuOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-60 min-h-screen flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-semibold">DNounce Admin</span>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-400 hover:text-white">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
