"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@repo/ui/skeleton";
import type { Project } from "@repo/types";
import { useProjects } from "@/lib/hooks/use-projects";
import { ProjectCard } from "@/components/dashboard/project-card";
import { CreateProjectModal } from "@/components/dashboard/create-project-modal";
import { DeleteProjectDialog } from "@/components/dashboard/delete-project-dialog";
import { useApiClient, withToast } from "@/lib/api-client";

export default function DashboardPage() {
  const api = useApiClient();
  const router = useRouter();
  const { projects, loading, error, refetch } = useProjects();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  function handleProjectCreated(project: Project) {
    refetch();
    router.push(`/projects/${project.id}`);
  }

  function handleProjectUpdated() {
    refetch();
    setEditProject(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteProject) return;
    const result = await withToast(
      () => api.projects.delete(deleteProject.id),
      "Failed to delete project"
    );
    if (result !== null) {
      toast.success("Project deleted");
      setDeleteProject(null);
      refetch();
    }
  }

  async function handleNewVideo(projectId: string) {
    const result = await withToast(
      () => api.videos.create(projectId),
      "Failed to create video"
    );
    if (result?.data) {
      router.push(`/videos/${result.data.id}`);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
            Your Projects
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Each project is a channel or content niche.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-[var(--accent-danger)]/30 bg-[var(--accent-danger)]/10 px-4 py-3 text-sm text-[var(--accent-danger)]">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-0 overflow-hidden"
            >
              <Skeleton className="h-40 w-full rounded-none" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[var(--bg-border)] p-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
            <FolderOpen className="h-6 w-6 text-[var(--text-muted)]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              No projects yet
            </h3>
            <p className="mt-1 max-w-xs text-sm text-[var(--text-secondary)]">
              Create a project for each channel or content niche you create for.
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create Your First Project
          </button>
        </div>
      )}

      {/* Project grid */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={setEditProject}
              onDelete={setDeleteProject}
              onNewVideo={handleNewVideo}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateProjectModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleProjectCreated}
      />
      <CreateProjectModal
        open={!!editProject}
        onOpenChange={(open) => !open && setEditProject(null)}
        project={editProject}
        onSuccess={handleProjectUpdated}
      />
      <DeleteProjectDialog
        project={deleteProject}
        onOpenChange={(open) => !open && setDeleteProject(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
