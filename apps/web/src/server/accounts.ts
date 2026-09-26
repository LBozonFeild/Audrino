/**
 * Local-tier accounts + project storage (PLAN §12.1 API shape, §12.2 layers).
 * Self-hosted tier: scrypt password hashes (never plaintext), hashed session
 * tokens in HttpOnly SameSite cookies, per-IP rate limits, request-size caps,
 * strict input validation, sanitized handles/titles, daily save quotas, an
 * append-only audit log, export that excludes secrets, and account deletion
 * that wipes the user + their projects. Email is stored but not verified on
 * this tier (no SMTP) — the `verified` flag + gates are ready for managed auth.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface AccountsApiOptions {
  rootDir: string;
  now?: () => number;
  /** local tier auto-verifies at signup (no SMTP); managed tier flips this */
  autoVerify?: boolean;
  savesPerDay?: number;
}

export interface ApiRequest {
  method: string;
  path: string; // "/api/..." including prefix
  body: unknown;
  cookie?: string;
  origin?: string;
  proto?: string;
  ip?: string;
}

export interface ApiResponse {
  status: number;
  json?: unknown;
  headers?: Record<string, string>;
}

interface UserRecord {
  id: string;
  email: string;
  handle: string;
  salt: string;
  hash: string;
  verified: boolean;
  avatar?: string;
  createdAt: number;
  savesDay: string;
  savesUsed: number;
}

interface SessionRecord {
  tokenHash: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

interface StoredProject {
  id: string;
  owner: string;
  title: string;
  isPublic: boolean;
  doc: unknown;
  createdAt: number;
  updatedAt: number;
}

const SESSION_COOKIE = "audrino_session";
const SESSION_TTL = 30 * 24 * 3600 * 1000;
const MAX_BODY = 2_000_000;
const MAX_AUTH_BODY = 32_000;
const SLURS = ["fuck", "shit", "nigger", "faggot", "cunt", "retard", "kike", "spic", "tranny", "whore"];

const HANDLE_RE = /^[a-z0-9_]{3,24}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function fail(status: number, error: string): ApiResponse {
  return { status, json: { error } };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Strip control chars, collapse whitespace, enforce length, block obvious slurs. */
export function sanitizeText(raw: unknown, maxLen: number, field: string): { value: string } | { error: string } {
  const t = str(raw).replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  if (!t) return { error: `${field} is required` };
  if (t.length > maxLen) return { error: `${field} must be ≤ ${maxLen} characters` };
  const low = t.toLowerCase();
  if (SLURS.some((s) => low.includes(s))) return { error: `${field} contains disallowed language` };
  return { value: t };
}

export function hashPassword(password: string, salt?: Buffer): { salt: string; hash: string } {
  const s = salt ?? crypto.randomBytes(16);
  const h = crypto.scryptSync(password, s, 64, { N: 16384, r: 8, p: 1 });
  return { salt: s.toString("base64"), hash: h.toString("base64") };
}

function verifyPassword(password: string, rec: { salt: string; hash: string }): boolean {
  const { hash } = hashPassword(password, Buffer.from(rec.salt, "base64"));
  const a = Buffer.from(hash, "base64");
  const b = Buffer.from(rec.hash, "base64");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function dayStamp(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function createAccountsApi(opts: AccountsApiOptions) {
  const now = opts.now ?? Date.now;
  const autoVerify = opts.autoVerify ?? true;
  const savesPerDay = opts.savesPerDay ?? 50;
  const root = opts.rootDir;
  const usersFile = path.join(root, "users.json");
  const sessionsFile = path.join(root, "sessions.json");
  const projectsDir = path.join(root, "projects");
  const auditFile = path.join(root, "audit.jsonl");

  const readJson = <T>(file: string, fallback: T): T => {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8")) as T;
    } catch {
      return fallback;
    }
  };
  const writeJson = (file: string, data: unknown): void => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
  };

  const audit = (actor: string, action: string, target: string, meta: Record<string, unknown> = {}): void => {
    fs.mkdirSync(root, { recursive: true });
    fs.appendFileSync(auditFile, JSON.stringify({ ts: now(), actor, action, target, meta }) + "\n");
  };

  // ---- rate limiting (sliding window per ip+route) --------------------------
  const hits = new Map<string, number[]>();
  const rateLimit = (key: string, max: number, windowMs: number): boolean => {
    const t = now();
    const arr = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
    if (arr.length >= max) {
      hits.set(key, arr);
      return false;
    }
    arr.push(t);
    hits.set(key, arr);
    return true;
  };

  const parseCookies = (cookie: string | undefined): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const part of (cookie ?? "").split(";")) {
      const i = part.indexOf("=");
      if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
    return out;
  };

  const sessionCookie = (token: string, proto: string | undefined): string => {
    const secure = proto === "https" ? "; Secure" : "";
    return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL / 1000}${secure}`;
  };

  const clearCookie = `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;

  const publicMe = (u: UserRecord): Record<string, unknown> => ({
    id: u.id,
    handle: u.handle,
    email: u.email,
    verified: u.verified,
    avatar: u.avatar ?? null,
    createdAt: u.createdAt,
  });

  function requireUser(cookie: string | undefined, users: Record<string, UserRecord>, sessions: Record<string, SessionRecord>): UserRecord | null {
    const token = parseCookies(cookie)[SESSION_COOKIE];
    if (!token) return null;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const s = sessions[tokenHash];
    if (!s || s.expiresAt < now()) return null;
    return users[s.userId] ?? null;
  }

  async function handle(req: ApiRequest): Promise<ApiResponse> {
    const ip = req.ip ?? "local";
    const p = req.path.split("?")[0];
    const method = req.method.toUpperCase();
    const isAuth = p.startsWith("/api/auth/");
    const bodySize = JSON.stringify(req.body ?? null)?.length ?? 0;
    if (bodySize > (isAuth ? MAX_AUTH_BODY : MAX_BODY)) return fail(413, "request too large");

    // §12.2: Origin allowlist alongside SameSite — reject cross-site posts
    if (req.origin) {
      const allowed = /https?:\/\/([a-z0-9.-]*\.)?(localhost|127\.0\.0\.1|e2b\.app)(:\d+)?$/i.test(req.origin);
      if (!allowed) return fail(403, "origin not allowed");
    }

    if (!rateLimit(`g:${ip}`, 120, 60_000)) return fail(429, "too many requests — slow down");

    const users = readJson<Record<string, UserRecord>>(usersFile, {});
    const sessions = readJson<Record<string, SessionRecord>>(sessionsFile, {});
    fs.mkdirSync(projectsDir, { recursive: true });
    const listProjects = (): StoredProject[] =>
      fs.readdirSync(projectsDir).filter((f) => f.endsWith(".json")).map((f) => readJson<StoredProject>(path.join(projectsDir, f), null as never)).filter(Boolean);

    // ---------------------------------------------------------- auth routes
    if (p === "/api/auth/signup" && method === "POST") {
      if (!rateLimit(`signup:${ip}`, 5, 3600_000)) return fail(429, "signups are rate-limited per hour");
      const b = req.body;
      if (!isRecord(b)) return fail(400, "body must be a JSON object");
      const email = str(b.email).trim().toLowerCase();
      const handleRaw = sanitizeText(b.handle, 24, "handle");
      const password = str(b.password);
      if (!EMAIL_RE.test(email) || email.length > 120) return fail(400, "valid email required");
      if ("error" in handleRaw) return fail(400, handleRaw.error);
      if (!HANDLE_RE.test(handleRaw.value)) return fail(400, "handle must be 3–24 letters, digits, or _");
      if (password.length < 10 || password.length > 200) return fail(400, "password must be 10–200 characters");
      if (Object.values(users).some((u) => u.handle.toLowerCase() === handleRaw.value.toLowerCase())) return fail(409, "handle is taken");
      if (Object.values(users).some((u) => u.email === email)) return fail(409, "email is already registered");
      const { salt, hash } = hashPassword(password);
      const rec: UserRecord = {
        id: crypto.randomUUID(),
        email,
        handle: handleRaw.value,
        salt,
        hash,
        verified: autoVerify,
        createdAt: now(),
        savesDay: dayStamp(now()),
        savesUsed: 0,
      };
      users[rec.id] = rec;
      writeJson(usersFile, users);
      const token = crypto.randomBytes(32).toString("base64url");
      sessions[crypto.createHash("sha256").update(token).digest("hex")] = {
        tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
        userId: rec.id,
        createdAt: now(),
        expiresAt: now() + SESSION_TTL,
      };
      writeJson(sessionsFile, sessions);
      audit(rec.id, "signup", rec.handle);
      return { status: 201, json: { me: publicMe(rec) }, headers: { "set-cookie": sessionCookie(token, req.proto) } };
    }

    if (p === "/api/auth/login" && method === "POST") {
      if (!rateLimit(`login:${ip}`, 10, 300_000)) return fail(429, "too many login attempts — try again in 5 minutes");
      const b = req.body;
      if (!isRecord(b)) return fail(400, "body must be a JSON object");
      const who = str(b.email ?? b.handle).trim().toLowerCase();
      const password = str(b.password);
      const user = Object.values(users).find((u) => u.email === who || u.handle.toLowerCase() === who);
      if (!user || !verifyPassword(password, user)) {
        audit(user?.id ?? "anon", "login-fail", who.slice(0, 40));
        return fail(401, "wrong email/handle or password");
      }
      const token = crypto.randomBytes(32).toString("base64url");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      sessions[tokenHash] = { tokenHash, userId: user.id, createdAt: now(), expiresAt: now() + SESSION_TTL };
      writeJson(sessionsFile, sessions);
      audit(user.id, "login", user.handle);
      return { status: 200, json: { me: publicMe(user) }, headers: { "set-cookie": sessionCookie(token, req.proto) } };
    }

    const me = requireUser(req.cookie, users, sessions);

    if (p === "/api/auth/logout" && method === "POST") {
      return { status: 204, headers: { "set-cookie": clearCookie } };
    }

    if (p === "/api/auth/logout-all" && method === "POST") {
      if (!me) return fail(401, "not signed in");
      for (const [k, s] of Object.entries(sessions)) if (s.userId === me.id) delete sessions[k];
      writeJson(sessionsFile, sessions);
      audit(me.id, "logout-all", me.handle);
      return { status: 204, headers: { "set-cookie": clearCookie } };
    }

    // ------------------------------------------------------------- /api/me
    if (p === "/api/me" && method === "GET") {
      if (!me) return fail(401, "not signed in");
      return { status: 200, json: { me: publicMe(me) } };
    }

    if (p === "/api/me" && method === "PATCH") {
      if (!me) return fail(401, "not signed in");
      const b = req.body;
      if (!isRecord(b)) return fail(400, "body must be a JSON object");
      if (b.handle !== undefined) {
        const h = sanitizeText(b.handle, 24, "handle");
        if ("error" in h) return fail(400, h.error);
        if (!HANDLE_RE.test(h.value)) return fail(400, "handle must be 3–24 letters, digits, or _");
        if (Object.values(users).some((u) => u.id !== me.id && u.handle.toLowerCase() === h.value.toLowerCase())) return fail(409, "handle is taken");
        me.handle = h.value;
      }
      if (b.avatar !== undefined) {
        const a = sanitizeText(b.avatar, 240, "avatar");
        if ("error" in a) return fail(400, a.error);
        me.avatar = a.value;
      }
      writeJson(usersFile, users);
      audit(me.id, "patch-me", me.handle);
      return { status: 200, json: { me: publicMe(me) } };
    }

    if (p === "/api/me/export" && method === "GET") {
      if (!me) return fail(401, "not signed in");
      const projects = listProjects().filter((x) => x.owner === me.id);
      audit(me.id, "export", me.handle);
      return { status: 200, json: { profile: publicMe(me), projects } }; // secrets excluded
    }

    if (p === "/api/me" && method === "DELETE") {
      if (!me) return fail(401, "not signed in");
      delete users[me.id];
      writeJson(usersFile, users);
      for (const [k, s] of Object.entries(sessions)) if (s.userId === me.id) delete sessions[k];
      writeJson(sessionsFile, sessions);
      for (const proj of listProjects()) if (proj.owner === me.id) fs.rmSync(path.join(projectsDir, `${proj.id}.json`), { force: true });
      audit(me.id, "delete-account", me.handle);
      return { status: 204, headers: { "set-cookie": clearCookie } };
    }

    // ------------------------------------------------------ /api/projects
    if (p === "/api/projects" && method === "GET") {
      if (!me) return fail(401, "not signed in");
      const mine = listProjects()
        .filter((x) => x.owner === me.id || x.isPublic)
        .map((x) => ({ id: x.id, title: x.title, isPublic: x.isPublic, owner: x.owner === me.id ? "me" : "other", updatedAt: x.updatedAt }));
      return { status: 200, json: { projects: mine } };
    }

    if (p === "/api/projects" && method === "POST") {
      if (!me) return fail(401, "not signed in");
      const stamp = dayStamp(now());
      if (me.savesDay !== stamp) {
        me.savesDay = stamp;
        me.savesUsed = 0;
      }
      if (me.savesUsed >= savesPerDay) return fail(429, `daily save limit (${savesPerDay}) reached — resets at UTC midnight`);
      const b = req.body;
      if (!isRecord(b)) return fail(400, "body must be a JSON object");
      const title = sanitizeText(b.title, 80, "title");
      if ("error" in title) return fail(400, title.error);
      if (!isRecord(b.doc)) return fail(400, "doc must be a project object");
      const rec: StoredProject = {
        id: crypto.randomUUID(),
        owner: me.id,
        title: title.value,
        isPublic: b.isPublic === true,
        doc: b.doc,
        createdAt: now(),
        updatedAt: now(),
      };
      writeJson(path.join(projectsDir, `${rec.id}.json`), rec);
      me.savesUsed += 1;
      writeJson(usersFile, users);
      audit(me.id, "project-save", rec.id, { title: rec.title });
      return { status: 201, json: { id: rec.id, title: rec.title, updatedAt: rec.updatedAt } };
    }

    const pm = /^\/api\/projects\/([a-f0-9-]{36})$/i.exec(p);
    if (pm) {
      const file = path.join(projectsDir, `${pm[1]}.json`);
      const rec = readJson<StoredProject>(file, null as never);
      if (!rec) return fail(404, "no such project");
      if (method === "GET") {
        if (!me && !rec.isPublic) return fail(401, "not signed in");
        if (me && rec.owner !== me.id && !rec.isPublic) return fail(403, "private project");
        return { status: 200, json: { id: rec.id, title: rec.title, doc: rec.doc, updatedAt: rec.updatedAt } };
      }
      if (method === "DELETE") {
        if (!me) return fail(401, "not signed in");
        if (rec.owner !== me.id) return fail(403, "not your project");
        fs.rmSync(file, { force: true });
        audit(me.id, "project-delete", rec.id);
        return { status: 204 };
      }
    }

    return fail(404, "unknown route");
  }

  return { handle };
}
