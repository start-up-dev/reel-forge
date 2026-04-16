import { redirect } from "next/navigation";

/**
 * Root route — redirect to dashboard.
 * Unauthenticated users will be caught by the Clerk middleware and sent to /sign-in.
 */
export default function RootPage() {
  redirect("/dashboard");
}
