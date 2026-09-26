import type { Project, ProjectManifest } from "./types";

/**
 * Derive the lightweight manifest (PLAN §5.5). Pure derivation — callers must
 * validate the project first. `build_hash` stays "" until the M1 compile
 * pipeline fills it; M0 never fabricates one.
 */
export function deriveManifest(
  project: Project,
  opts: { projectId?: string; revisionId?: string } = {},
): ProjectManifest {
  return {
    project_id: opts.projectId ?? "local",
    revision_id: opts.revisionId ?? "rev-0",
    boards: [...new Set(project.boards.map((b) => b.type))],
    component_types: [...new Set(project.components.map((c) => c.type))].sort(),
    libraries: project.build.libraries.map((l) => l.name),
    build_hash: "",
    dsl_version: project.meta.dslVersion,
  };
}
