"use client";

import DashboardLayout from "@/app/dashboard/layout";

export default function AuthUsersLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}