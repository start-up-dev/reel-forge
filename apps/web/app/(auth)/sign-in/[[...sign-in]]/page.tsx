import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full",
                header: "hidden",
                formButtonPrimary:
                  "bg-accent-primary hover:bg-accent-primary/90 text-white",
                footerActionLink:
                  "text-accent-primary hover:text-accent-primary/80",
              },
            }}
            forceRedirectUrl="/dashboard"
            signUpUrl="/sign-up"
          />
        </div>
      </div>
    </div>
  );
}
