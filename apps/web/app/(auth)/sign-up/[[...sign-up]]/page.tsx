import { SignUp } from "@clerk/nextjs";
import { Zap } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4 py-12">
      <div className="w-full max-w-[400px]">
        {/* Logo & Branding */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary/10 ring-1 ring-accent-primary/20">
            <Zap className="h-7 w-7 text-accent-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-text-primary">
              Create account
            </h1>
            <p className="mt-1.5 text-sm font-medium text-text-secondary">
              Start creating viral videos with AI
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full",
                header: "hidden",
                formButtonPrimary: "bg-accent-primary hover:bg-accent-primary/90 text-white",
                footerActionLink: "text-accent-primary hover:text-accent-primary/80",
              },
            }}
            forceRedirectUrl="/dashboard"
            signInUrl="/sign-in"
          />
        </div>
      </div>
    </div>
  );
}
