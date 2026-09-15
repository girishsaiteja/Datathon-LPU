"use client";

import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({
  children,
  dark = false,
  fill = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
  fill?: boolean;
}) {
  return (
    <div className={`flex h-screen overflow-hidden ${dark ? "bg-navy-900" : "bg-[#eef3f9]"}`}>
      <Sidebar />
      <main className={`min-w-0 flex-1 ${fill ? "flex h-full min-h-0 flex-col overflow-hidden" : "overflow-y-auto"}`}>
        {children}
      </main>
    </div>
  );
}
