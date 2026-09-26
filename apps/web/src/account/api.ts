/** Shared account/projects REST helper (popovers + home page). */

export interface Me {
  id: string;
  handle: string;
  email: string;
  verified: boolean;
}

export interface ProjectSummary {
  id: string;
  title: string;
  isPublic: boolean;
  owner: string;
  updatedAt: number;
}

export async function api(
  path: string,
  method: string,
  body?: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const r = await fetch(path, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = ((await r.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  return { status: r.status, json };
}
