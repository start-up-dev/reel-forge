import { Suspense } from "react";
import { WizardClient } from "./wizard-client";
import { Skeleton } from "@repo/ui/skeleton";

export default async function WizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<WizardSkeleton />}>
      <WizardClient videoId={id} />
    </Suspense>
  );
}

function WizardSkeleton() {
  return (
    <div className="flex h-screen flex-col">
      <div className="flex h-16 items-center gap-4 border-b border-[var(--bg-border)] bg-[var(--bg-surface)] px-6">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="flex flex-1 flex-col items-center gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-80" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-xl space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
