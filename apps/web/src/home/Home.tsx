/**
 * Home page — start a new project, continue an old one, sign in.
 * Routes: "" / "#/" lands here; the editor lives at "#/editor" (see nav.ts).
 */
import { useEffect, useState } from "react";
import type { Project } from "@audrino/schema";
import { api, type Me, type ProjectSummary } from "../account/api";
import { clearAutosave, docLooksTrivial, loadAutosave } from "../dsl/autosave";
import { createEmptyProject } from "../dsl/load";
import { openInEditor } from "../nav";

function partCount(doc: Project): number {
  return doc.boards.length + doc.components.length;
}

export function Home() {
  const [me, setMe] = useState<Me | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Re-read on every render so "Continue" disappears after New project clears it.
  const saved = loadAutosave();
  const canContinue = saved !== null && !docLooksTrivial(saved);

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
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitAuth = async () => {
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
    await refresh();
  };

  const logout = async () => {
    await api("/api/auth/logout", "POST");
    setMe(null);
    setProjects([]);
  };

  const newProject = () => {
    clearAutosave();
    openInEditor(structuredClone(createEmptyProject()));
  };

  const openCloud = async (id: string) => {
    const r = await api(`/api/projects/${id}`, "GET");
    if (r.status !== 200) {
      setError(String(r.json.error ?? "could not open project"));
      return;
    }
    openInEditor(r.json.doc as unknown as Project);
  };

  const deleteCloud = async (p: ProjectSummary) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    const r = await api(`/api/projects/${p.id}`, "DELETE");
    if (r.status >= 300) setError(String(r.json.error ?? "delete failed"));
    else setProjects((xs) => xs.filter((x) => x.id !== p.id));
  };

  return (
    <div className="home-shell">
      <header className="home-topbar">
        <span className="brand">◎ Audrino</span>
        <span className="dim">Arduino circuits in your browser</span>
        <span className="spacer" />
        {me ? (
          <>
            <span className="badge">@{me.handle}</span>
            <button onClick={() => void logout()}>Log out</button>
          </>
        ) : (
          <a className="home-anchor" href="#home-auth">
            Log in / Sign up
          </a>
        )}
      </header>

      <main className="home-main">
        <section className="home-hero">
          <h1>Build it. Wire it. Run it.</h1>
          <p>
            Drag parts from the palette, wire up a real circuit, and simulate the firmware — no install, no board
            required.
          </p>
        </section>

        <div className="home-grid">
          <section className="home-card">
            <h2>New project</h2>
            <p className="dim">An empty workplane, a fresh sketch, and the full parts palette.</p>
            <button className="primary" onClick={newProject}>
              ＋ Create project
            </button>
          </section>

          <section className="home-card">
            <h2>Continue</h2>
            {canContinue && saved ? (
              <>
                <p className="home-proj-title">{saved.meta.name}</p>
                <p className="dim">
                  {partCount(saved)} part{partCount(saved) === 1 ? "" : "s"} · autosaved in this browser
                </p>
                <button onClick={() => openInEditor(saved)}>▶ Resume where you left off</button>
              </>
            ) : (
              <p className="dim">Nothing saved in this browser yet — your work autosaves here as you edit.</p>
            )}
          </section>

          <section className="home-card" id="home-auth">
            <h2>{me ? "Your projects" : "Sign in"}</h2>
            {me ? (
              <>
                <p className="dim">Saved to your account — open one to keep editing.</p>
                {projects.length > 0 ? (
                  <div className="home-proj-list">
                    {projects.map((p) => (
                      <div className="home-proj-row" key={p.id}>
                        <button className="home-proj-open" onClick={() => void openCloud(p.id)} title="Open project">
                          {p.title}
                          <span className="dim"> · {new Date(p.updatedAt).toLocaleDateString()}</span>
                        </button>
                        {p.owner === "me" && (
                          <button onClick={() => void deleteCloud(p)} title="Delete">
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dim">No cloud projects yet — press 💾 Save in the editor to store one here.</p>
                )}
              </>
            ) : (
              <>
                <div className="row">
                  <button className={mode === "login" ? "tool-active" : ""} onClick={() => setMode("login")}>
                    Log in
                  </button>
                  <button className={mode === "signup" ? "tool-active" : ""} onClick={() => setMode("signup")}>
                    Sign up
                  </button>
                </div>
                <input
                  placeholder="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                {mode === "signup" && (
                  <input
                    placeholder="handle (3–24 letters, digits, _)"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    autoComplete="username"
                  />
                )}
                <input
                  type="password"
                  placeholder="password (10+ characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitAuth();
                  }}
                />
                {error && <div className="badge warn">{error}</div>}
                <button className="primary" onClick={() => void submitAuth()} disabled={busy}>
                  {busy ? "…" : mode === "login" ? "Log in" : "Create account"}
                </button>
                <p className="dim">
                  Sign in to keep projects across devices. Local work stays in this browser either way.
                </p>
              </>
            )}
            {me && error && <div className="badge warn">{error}</div>}
          </section>
        </div>

        <footer className="home-foot dim">
          Every edit autosaves locally · share links carry the whole circuit in the URL · no account required
        </footer>
      </main>
    </div>
  );
}
