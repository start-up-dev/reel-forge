import type { ProjectRow } from "../lib/db/schema.js";

export function projectContext(project: ProjectRow): string {
  const platforms = Array.isArray(project.platforms)
    ? project.platforms.join(", ")
    : project.platforms;
  return [
    `Platform: ${platforms}`,
    `Niche: ${project.niche}`,
    `Target audience: ${project.targetAudience}`,
    `Video style: ${project.videoStyle}`,
    `Tone: ${project.tone}`,
    `Language: ${project.language}`,
    project.claudeSystemPrompt ? `Additional instructions: ${project.claudeSystemPrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function isBengali(project: ProjectRow): boolean {
  return project.language?.toLowerCase() === "bengali";
}
