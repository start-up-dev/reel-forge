import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: { colorPrimary: "#f55c2a" },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
