"use client";

import { ConfirmDialog } from "@repo/ui/confirm-dialog";
import type { Project } from "@repo/types";

interface DeleteProjectDialogProps {
  project: Project | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}

export function DeleteProjectDialog({
  project,
  onOpenChange,
  onConfirm,
}: DeleteProjectDialogProps) {
  return (
    <ConfirmDialog
      open={!!project}
      onOpenChange={onOpenChange}
      title="Delete Project"
      description={
        project
          ? `Are you sure you want to delete "${project.name}"? All videos in this project will also be deleted. This cannot be undone.`
          : ""
      }
      confirmLabel="Delete Project"
      cancelLabel="Cancel"
      variant="danger"
      onConfirm={onConfirm}
    />
  );
}
