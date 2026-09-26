/**
 * Home page — the product's front door: hero, template gallery, start/continue
 * cards, and sign-in. Routes: "" / "#/" lands here; the editor is "#/editor"
 * (see nav.ts).
 */
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PART_DEFINITIONS, type Project } from "@audrino/schema";
import { api, type Me, type ProjectSummary } from "../account/api";
import { ArtDefs, PartGlyph } from "../canvas/PartGlyph";
import { clearAutosave, docLooksTrivial, loadAutosave } from "../dsl/autosave";
import { createEmptyProject, loadFixture, type FixtureId } from "../dsl/load";
import { openInEditor } from "../nav";
import { docBBox } from "../state/ops";

function partCount(doc: Project): number {
  return doc.boards.length + doc.components.length;
}

const TEMPLATES: { id: FixtureId; title: string; desc: string }[] = [
  { id: "blink", title: "Blink", desc: "The hello-world: one LED on D13." },
  { id: "traffic-light", title: "Traffic light", desc: "Three LEDs sequenced by firmware." },
  { id: "servo-arm", title: "Servo arm", desc: "A potentiometer sweeps a servo." },
];

/** Live mini-render of a fixture (real part art, framed to its bounding box). */
function FixturePreview(props: { doc: Project }) {
  const vb = useMemo(() => {
    const bbox = docBBox(props.doc);
    if (!bbox) return "0 0 100 60";
    const pad = 10;
    return `${bbox.minX - pad} ${bbox.minY - pad} ${bbox.maxX - bbox.minX + pad * 2} ${
      bbox.maxY - bbox.minY + pad * 2
    }`;
  }, [props.doc]);
  return (
    <svg className="tpl-preview" viewBox={vb} preserveAspectRatio="xMidYMid meet" aria-hidden>
      {props.doc.wires.map((w) => (
        <polyline
          key={w.id}
          points={w.points.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="var(--bench-wire)"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {props.doc.boards.map((b) => (
        <PartGlyph key={b.id} type={b.type} transform={b.transform} board />
      ))}
      {props.doc.components.map((c) => (
        <PartGlyph key={c.id} type={c.type} transform={c.transform} values={c.props} />
      ))}
    </svg>
  );
}

const FEATURES: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    title: "Real part catalog",
    body: "Boards, passives, sensors and modules with true-to-life footprints and pinouts.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" strokeLinejoin="round" />
      </svg>
    ),
    title: "Live simulation",
    body: "Compile the sketch, watch pins flip, LEDs light, and the scope trace move in real time.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" strokeLinecap="round" />
        <circle cx="12" cy="12" r="3.4" />
      </svg>
    ),
    title: "AI builds circuits",
    body: "Describe a build in one sentence — parts, wiring and firmware land on the canvas.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M10 13a4.5 4.5 0 0 0 6.4.4l2.5-2.5a4.5 4.5 0 0 0-6.4-6.4L11.2 6" strokeLinecap="round" />
        <path d="M14 11a4.5 4.5 0 0 0-6.4-.4l-2.5 2.5a4.5 4.5 0 0 0 6.4 6.4L12.8 18" strokeLinecap="round" />
      </svg>
    ),
    title: "Share in one link",
    body: "The whole circuit travels in the URL — no account, no export step, works offline.",
  },
];

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
  const templates = useMemo(() => TEMPLATES.map((t) => ({ ...t, doc: loadFixture(t.id) })), []);

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
      {/* one shared defs block: part-art gradients/filters for the previews */}
      <svg className="defs-only" aria-hidden focusable="false">
        <ArtDefs />
      </svg>

      <header className="home-topbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden>
            ◎
          </span>
          Audrino
        </span>
        <span className="dim home-tag">the Arduino workbench, in your browser</span>
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
          <div className="hero-bg" aria-hidden>
            <svg viewBox="0 0 1200 480" preserveAspectRatio="xMidYMid slice">
              <g className="pcb-traces" fill="none" strokeWidth="2">
                <path d="M-20 90 H240 L300 150 H520" />
                <path d="M-20 380 H180 L260 300 H470 L530 240 H760" />
                <path d="M1220 70 H980 L920 130 H700 L640 190 H520" />
                <path d="M1220 400 H1020 L940 320 H740" />
                <path d="M60 480 V400 L140 320 V220" />
                <path d="M1140 480 V380 L1060 300 V180" />
              </g>
              <g className="pcb-vias">
                <circle cx="300" cy="150" r="6" />
                <circle cx="530" cy="240" r="6" />
                <circle cx="920" cy="130" r="6" />
                <circle cx="260" cy="300" r="6" />
                <circle cx="940" cy="320" r="6" />
                <circle cx="140" cy="320" r="6" />
                <circle cx="640" cy="190" r="6" />
                <circle cx="470" cy="300" r="6" />
              </g>
            </svg>
          </div>
          <span className="hero-eyebrow">◇ open-source · no install · runs 100% in your browser</span>
          <h1>
            <span className="grad">Build it. Wire it. Run it.</span>
          </h1>
          <p>
            Drag parts from the palette, wire up a real circuit, and simulate the firmware — no install, no board
            required.
          </p>
          <div className="hero-cta">
            <button className="primary" onClick={newProject}>
              Start building →
            </button>
            <a className="btn-ghost" href="#tpl">
              Explore templates
            </a>
          </div>
          <div className="hero-chips">
            <span>{PART_DEFINITIONS.length} parts</span>
            <span>live simulation</span>
            <span>AI circuit builder</span>
            <span>48 themes</span>
          </div>
        </section>

        <section className="tpl-section" id="tpl">
          <div className="sec-head">
            <h2>Start from a template</h2>
            <span className="dim">working circuits you can open and remix right away</span>
          </div>
          <div className="tpl-grid">
            {templates.map((t) => (
              <button key={t.id} className="tpl-card" onClick={() => openInEditor(t.doc)}>
                <span className="tpl-preview-wrap">
                  <FixturePreview doc={t.doc} />
                </span>
                <span className="tpl-meta">
                  <strong>{t.title}</strong>
                  <span className="dim">{t.desc}</span>
                  <span className="tpl-cta">Open in editor →</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="home-grid">
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
        </section>

        <section className="feat-grid">
          {FEATURES.map((f) => (
            <div className="feat-card" key={f.title}>
              <span className="feat-icon">{f.icon}</span>
              <strong>{f.title}</strong>
              <p className="dim">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="home-foot dim">
        Every edit autosaves locally · share links carry the whole circuit in the URL · no account required
      </footer>
    </div>
  );
}
