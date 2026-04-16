import { Toaster } from "sonner";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
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
  );
}
