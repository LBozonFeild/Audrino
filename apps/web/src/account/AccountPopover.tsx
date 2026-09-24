import { useEffect, useRef, useState } from "react";
import type { Project } from "@audrino/schema";
import { clearAutosave, loadAutosave, docLooksTrivial } from "../dsl/autosave";
import { createEmptyProject } from "../dsl/load";
import { useEditorStore } from "../state/store";

interface Me {
  id: string;
  handle: string;
  email: string;
  verified: boolean;
}

interface ProjectSummary {
  id: string;
  title: string;
  isPublic: boolean;
  owner: string;
  updatedAt: number;
}

async function api(path: string, method: string, body?: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const r = await fetch(path, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = ((await r.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  return { status: r.status, json };
}

/** §12.1 account surface: signup/login, profile, saved projects, export, deletion. */
export function AccountPopover(props: { notify: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [me, setMe] = useState<Me | null>(null);
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  const refresh = async () => {
    const r = await api("/api/me", "GET");
    if (r.status === 200) {
      setMe(r.json.me as unknown as Me);
      const p = await api("/api/projects", "GET");
      if (p.status === 200) setProjects((p.json.projects as unknown as ProjectSummary[]) ?? []);
    } else {
      setMe(null);
      setProjects([]);
    }
  };

  useEffect(() => {
    if (open) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const path = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const body = mode === "login" ? { email, password } : { email, handle, password };
    const r = await api(path, "POST", body);
    setBusy(false);
    if (r.status >= 300) {
      setError(String(r.json.error ?? "request failed"));
      return;
    }
    setEmail("");
    setHandle("");
    setPassword("");
    props.notify(mode === "login" ? `Welcome back, ${(r.json.me as unknown as Me).handle}` : "Account created — you're signed in");
    await refresh();
  };

  const logout = async (everywhere: boolean) => {
    await api(everywhere ? "/api/auth/logout-all" : "/api/auth/logout", "POST");
    setMe(null);
    props.notify(everywhere ? "Signed out everywhere" : "Signed out");
  };

  const saveProject = async () => {
    const doc: Project = useEditorStore.getState().doc;
    const r = await api("/api/projects", "POST", { title: doc.meta.name, doc });
    if (r.status >= 300) {
      props.notify(String(r.json.error ?? "save failed"));
      return;
    }
    props.notify(`Saved "${String(r.json.title)}"`);
    await refresh();
  };

  const openProject = async (id: string) => {
    const r = await api(`/api/projects/${id}`, "GET");
    if (r.status !== 200) {
      props.notify(String(r.json.error ?? "open failed"));
      return;
    }
    const feedback = useEditorStore.getState().loadProject(r.json.doc as unknown as Project);
    props.notify(feedback ?? `Opened "${String(r.json.title)}"`);
    setOpen(false);
  };

  const deleteProject = async (id: string) => {
    const r = await api(`/api/projects/${id}`, "DELETE");
    if (r.status >= 300) props.notify(String(r.json.error ?? "delete failed"));
    else props.notify("Project deleted");
    await refresh();
  };

  const exportAccount = async () => {
    const r = await api("/api/me/export", "GET");
    if (r.status !== 200) return props.notify("export failed");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(r.json, null, 2)], { type: "application/json" }));
    a.download = "audrino-account-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
    props.notify("Account export downloaded (no secrets included)");
  };

  const deleteAccount = async () => {
    if (!window.confirm("Delete your account and all saved projects? This cannot be undone.")) return;
    const r = await api("/api/me", "DELETE");
    if (r.status === 204) {
      setMe(null);
      props.notify("Account deleted");
    } else props.notify(String(r.json.error ?? "delete failed"));
  };

  const newProject = () => {
    useEditorStore.getState().loadProject(structuredClone(createEmptyProject()));
    clearAutosave();
    props.notify("New project started");
    setOpen(false);
  };

  return (
    <div className="theme-picker" ref={box}>
      <button className="theme-btn" onClick={() => setOpen(!open)} title="Account & projects">
        {me ? `@${me.handle}` : "Account"} <span className="chev">▾</span>
      </button>
      {open && (
        <div className="theme-pop" style={{ width: 320 }}>
          <div className="theme-pop-head">{me ? "Account" : "Sign in"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10 }}>
            {!me && (
              <>
                <div className="row">
                  <button className={mode === "login" ? "tool-active" : ""} onClick={() => setMode("login")}>
                    Log in
                  </button>
                  <button className={mode === "signup" ? "tool-active" : ""} onClick={() => setMode("signup")}>
                    Sign up
                  </button>
                </div>
                <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
                {mode === "signup" && (
                  <input
                    placeholder="handle (3–24 letters, digits, _)"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    autoComplete="off"
                  />
                )}
                <input
                  type="password"
                  placeholder="password (10+ characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                />
                {error && <div className="badge warn">{error}</div>}
                <button className="primary" onClick={submit} disabled={busy}>
                  {busy ? "…" : mode === "login" ? "Log in" : "Create account"}
                </button>
                <div className="dim">
                  Passwords are salted + scrypt-hashed on the app server and never logged. Local tier: email is stored,
                  not verified (managed tier adds verification gates per PLAN §12.1).
                </div>
              </>
            )}
            {me && (
              <>
                <div className="dim">
                  {me.handle} · {me.email}
                </div>
                <button onClick={saveProject}>💾 Save current project</button>
                {projects.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflow: "auto" }}>
                    {projects.map((p) => (
                      <div key={p.id} className="row">
                        <button
                          style={{ flex: 1, textAlign: "left" }}
                          onClick={() => openProject(p.id)}
                          title={p.owner === "me" ? "Open" : "Public project — open"}
                        >
                          {p.title}
                        </button>
                        {p.owner === "me" && (
                          <button onClick={() => deleteProject(p.id)} title="Delete">
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={exportAccount}>⤓ Export my data</button>
                <div className="row">
                  <button onClick={() => logout(false)}>Log out</button>
                  <button onClick={() => logout(true)} title="Revoke every session">
                    Log out everywhere
                  </button>
                </div>
                <button onClick={deleteAccount}>Delete account…</button>
              </>
            )}
            <button onClick={newProject} title="Clear the canvas and start over">
              ⟳ New project
            </button>
            {loadAutosave() && !docLooksTrivial(loadAutosave() as Project) && (
              <div className="dim">Autosave is on — this browser keeps your work across reloads.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
