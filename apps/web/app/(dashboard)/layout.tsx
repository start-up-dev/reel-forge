"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <ClerkProvider
      appearance={{
        variables: { colorPrimary: "#f55c2a" },
      }}
    >
      <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
        <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader onMenuToggle={() => setSidebarOpen((o) => !o)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--bg-elevated)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-primary)",
            },
          }}
        />
      </div>
    </ClerkProvider>
  );
}
