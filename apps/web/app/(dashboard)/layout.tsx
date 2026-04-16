"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { useUser } from "@/lib/hooks/use-user";

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { user, loading } = useUser();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Only evaluate after both Clerk and the user profile are fully loaded
    if (!clerkLoaded || !isSignedIn || loading) return;
    if (user && !user.onboardingComplete) {
      setShowOnboarding(true);
    }
  }, [clerkLoaded, isSignedIn, user, loading]);

  return (
    <>
      {children}
      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}
    </>
  );
}

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
        <main className="flex-1 overflow-y-auto p-6">
          <OnboardingGate>{children}</OnboardingGate>
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
  );
}
