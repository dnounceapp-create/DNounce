"use client";

import {
  User,
  Lock,
  LogOut,
  Bell,
  Languages,
  Moon,
  Users,
  LifeBuoy,
  Flag,
  FileText,
  Monitor,
} from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const sections = [
    {
      title: "Account",
      items: [
        { label: "Account & Privacy", icon: Lock, href: "/dashboard/settings/account" },
        { label: "Profile Info", icon: User, href: "/dashboard/settings/profile" },
        { label: "Log Out", icon: LogOut, href: "/logout", danger: true },
      ],
    },
    {
      title: "App Preferences",
      items: [
        { label: "Refer a Friend", icon: Users, href: "/dashboard/settings/refer" },
        { label: "Notifications", icon: Bell, href: "/dashboard/settings/notifications" },
        { label: "Language", icon: Languages, href: "/dashboard/settings/language" },
        { label: "Display", icon: Moon, href: "/dashboard/settings/display" },
      ],
    },
    {
      title: "Support",
      items: [
        { label: "Report an Issue", icon: Flag, href: "/dashboard/settings/report" },
        { label: "Contact Support", icon: LifeBuoy, href: "/dashboard/settings/support" },
        { label: "IT Support Screen (Share Screen Mode)", icon: Monitor, href: "/dashboard/settings/it-support" },
        { label: "Terms and Conditions", icon: FileText, href: "/dashboard/settings/terms" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Page Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-8 text-gray-900 text-center">
          Settings
        </h1>

        {sections.map((section) => (
          <div key={section.title} className="mb-10">
            <h2 className="text-gray-500 text-sm font-semibold uppercase mb-3 tracking-wide">
              {section.title}
            </h2>

            <div className="flex flex-col gap-3">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center justify-between px-5 py-4 rounded-2xl border border-gray-100 
                    bg-white shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 
                    ${item.danger ? "text-red-500 hover:bg-red-50 hover:border-red-200" : "text-gray-800 hover:bg-gray-50"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-5 h-5 ${
                          item.danger ? "text-red-500" : "text-gray-500"
                        }`}
                      />
                      <span className="font-medium text-sm sm:text-base">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-gray-400">›</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
