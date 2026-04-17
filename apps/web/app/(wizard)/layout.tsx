import { Toaster } from "sonner";

export default function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {children}
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
