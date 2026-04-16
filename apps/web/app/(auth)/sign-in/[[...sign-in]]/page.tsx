import { SignIn } from "@clerk/nextjs";
import { Zap } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15">
            <Zap className="h-6 w-6 text-[var(--accent-primary)]" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Sign in to continue creating viral videos
            </p>
          </div>
        </div>

        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-[#13131A] border border-[#2A2A3A] shadow-[0_24px_64px_rgba(0,0,0,0.7)] rounded-2xl",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton:
                "bg-[#1C1C27] border border-[#2A2A3A] text-[#F4F4F8] hover:bg-[#2A2A3A] transition-colors",
              dividerLine: "bg-[#2A2A3A]",
              dividerText: "text-[#5A5A72]",
              formFieldLabel: "text-[#9898B0] text-sm",
              formFieldInput:
                "bg-[#1C1C27] border border-[#2A2A3A] text-[#F4F4F8] rounded-lg focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC]",
              formButtonPrimary:
                "bg-[#7C5CFC] hover:bg-[#7C5CFC]/90 text-white rounded-lg font-medium",
              footerActionLink: "text-[#7C5CFC] hover:text-[#7C5CFC]/80",
              identityPreviewText: "text-[#F4F4F8]",
              identityPreviewEditButtonIcon: "text-[#9898B0]",
            },
          }}
          forceRedirectUrl="/dashboard"
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
}
