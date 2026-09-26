import { describe, expect, it, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createAccountsApi, hashPassword, sanitizeText } from "../src/server/accounts";
import { createEmptyProject } from "../src/dsl/load";

let root: string;
const T0 = Date.UTC(2026, 8, 24, 12);

function apiFor(overrides: Partial<Parameters<typeof createAccountsApi>[0]> = {}) {
  return createAccountsApi({ rootDir: root, now: () => T0, ...overrides });
}

const cookieOf = (r: { headers?: Record<string, string> }): string => {
  const raw = r.headers?.["set-cookie"] ?? "";
  return raw.split(";")[0];
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "audrino-accounts-"));
});

describe("hardening primitives", () => {
  it("scrypt hashes are salted, verifiable, and never the password", () => {
    const a = hashPassword("correct horse battery");
    const b = hashPassword("correct horse battery");
    expect(a.hash).not.toEqual(b.hash); // fresh salt
    expect(Buffer.from(a.hash, "base64").length).toBe(64);
    expect(a.hash).not.toContain("correct");
  });

  it("sanitizeText strips control chars, caps length, and blocks slurs", () => {
    expect(sanitizeText("  hello\u0000 world  ", 20, "t")).toEqual({ value: "hello world" });
    expect("error" in sanitizeText("x".repeat(90), 80, "title")).toBe(true);
    expect("error" in sanitizeText("what a retard", 40, "title")).toBe(true);
  });
});

describe("accounts API (§12.1 shape, §12.2 layers)", () => {
  it("signup hashes the password (plaintext never on disk) and sets a session cookie", async () => {
    const api = apiFor();
    const r = await api.handle({
      method: "POST", path: "/api/auth/signup", ip: "1.1.1.1",
      body: { email: "A@Example.com", handle: "alice", password: "correct horse battery" },
    });
    expect(r.status).toBe(201);
    expect((r.json as { me: { handle: string } }).me.handle).toBe("alice");
    expect(r.headers?.["set-cookie"]).toContain("HttpOnly");
    expect(r.headers?.["set-cookie"]).toContain("SameSite=Lax");
    const usersRaw = fs.readFileSync(path.join(root, "users.json"), "utf8");
    expect(usersRaw).not.toContain("correct horse battery");
    expect(usersRaw.toLowerCase()).toContain("alice");
  });

  it("rejects duplicate handle/email and malformed signup input", async () => {
    const api = apiFor();
    let n = 0;
    const mk = (body: Record<string, unknown>) =>
      api.handle({ method: "POST", path: "/api/auth/signup", ip: `2.2.2.${++n}`, body });
    expect((await mk({ email: "a@b.co", handle: "bob_1", password: "long enough pw" })).status).toBe(201);
    expect((await mk({ email: "c@b.co", handle: "bob_1", password: "long enough pw" })).status).toBe(409);
    expect((await mk({ email: "a@b.co", handle: "other", password: "long enough pw" })).status).toBe(409);
    expect((await mk({ email: "a@b.co", handle: "x", password: "long enough pw" })).status).toBe(400);
    expect((await mk({ email: "a@b.co", handle: "fine_name", password: "short" })).status).toBe(400);
    expect((await mk({ email: "not-an-email", handle: "fine_name", password: "long enough pw" })).status).toBe(400);
  });

  it("login verifies with scrypt and rate-limits brute force per IP", async () => {
    const api = apiFor();
    await api.handle({ method: "POST", path: "/api/auth/signup", ip: "3.3.3.3", body: { email: "x@y.co", handle: "carol", password: "long enough pw" } });
    const bad = { method: "POST", path: "/api/auth/login", ip: "4.4.4.4", body: { email: "x@y.co", password: "wrong password!" } };
    for (let i = 0; i < 10; i++) expect((await api.handle(bad)).status).toBe(401); // limit = 10 / 5 min
    expect((await api.handle(bad)).status).toBe(429); // 11th is rejected
    const ok = await api.handle({ method: "POST", path: "/api/auth/login", ip: "5.5.5.5", body: { handle: "carol", password: "long enough pw" } });
    expect(ok.status).toBe(200);
    expect(ok.headers?.["set-cookie"]).toBeTruthy();
  });

  it("session round-trips through /api/me and logout-everywhere revokes it", async () => {
    const api = apiFor();
    const s = await api.handle({ method: "POST", path: "/api/auth/signup", ip: "6.6.6.6", body: { email: "d@y.co", handle: "dave", password: "long enough pw" } });
    const cookie = cookieOf(s);
    const me = await api.handle({ method: "GET", path: "/api/me", cookie });
    expect(me.status).toBe(200);
    expect((me.json as { me: { handle: string } }).me.handle).toBe("dave");
    expect(JSON.stringify(me.json)).not.toContain("hash");
    await api.handle({ method: "POST", path: "/api/auth/logout-all", cookie });
    expect((await api.handle({ method: "GET", path: "/api/me", cookie })).status).toBe(401);
  });

  it("PATCH handle enforces format and uniqueness", async () => {
    const api = apiFor();
    const s = await api.handle({ method: "POST", path: "/api/auth/signup", ip: "7.7.7.7", body: { email: "e@y.co", handle: "erin_", password: "long enough pw" } });
    const cookie = cookieOf(s);
    expect((await api.handle({ method: "PATCH", path: "/api/me", cookie, body: { handle: "new_handle" } })).status).toBe(200);
    expect((await api.handle({ method: "PATCH", path: "/api/me", cookie, body: { handle: "x" } })).status).toBe(400);
    await api.handle({ method: "POST", path: "/api/auth/signup", ip: "8.8.8.8", body: { email: "f@y.co", handle: "frank", password: "long enough pw" } });
    const s2 = await api.handle({ method: "POST", path: "/api/auth/login", ip: "8.8.8.8", body: { email: "f@y.co", password: "long enough pw" } });
    expect((await api.handle({ method: "PATCH", path: "/api/me", cookie: cookieOf(s2), body: { handle: "new_handle" } })).status).toBe(409);
  });

  it("projects: save → list → open → delete, with a daily save quota", async () => {
    const api = apiFor({ savesPerDay: 2 });
    const s = await api.handle({ method: "POST", path: "/api/auth/signup", ip: "9.9.9.9", body: { email: "g@y.co", handle: "gina", password: "long enough pw" } });
    const cookie = cookieOf(s);
    const doc = createEmptyProject();
    doc.meta.name = "Blinky";
    const p1 = await api.handle({ method: "POST", path: "/api/projects", cookie, body: { title: "Blinky", doc } });
    expect(p1.status).toBe(201);
    const id = (p1.json as { id: string }).id;
    const list = await api.handle({ method: "GET", path: "/api/projects", cookie });
    expect((list.json as { projects: { id: string }[] }).projects.map((x) => x.id)).toContain(id);
    const got = await api.handle({ method: "GET", path: `/api/projects/${id}`, cookie });
    expect((got.json as { title: string }).title).toBe("Blinky");
    await api.handle({ method: "POST", path: "/api/projects", cookie, body: { title: "Two", doc } });
    expect((await api.handle({ method: "POST", path: "/api/projects", cookie, body: { title: "Three", doc } })).status).toBe(429);
    expect((await api.handle({ method: "DELETE", path: `/api/projects/${id}`, cookie })).status).toBe(204);
    expect((await api.handle({ method: "GET", path: `/api/projects/${id}`, cookie })).status).toBe(404);
  });

  it("export carries projects but zero secrets; delete-account wipes everything", async () => {
    const api = apiFor();
    const s = await api.handle({ method: "POST", path: "/api/auth/signup", ip: "10.10.10.10", body: { email: "h@y.co", handle: "hank", password: "long enough pw" } });
    const cookie = cookieOf(s);
    await api.handle({ method: "POST", path: "/api/projects", cookie, body: { title: "Keep?", doc: createEmptyProject() } });
    const ex = await api.handle({ method: "GET", path: "/api/me/export", cookie });
    const raw = JSON.stringify(ex.json);
    expect(raw).toContain("hank");
    expect(raw).not.toContain("salt");
    expect(raw).not.toContain("\"hash\"");
    const del = await api.handle({ method: "DELETE", path: "/api/me", cookie });
    expect(del.status).toBe(204);
    expect((await api.handle({ method: "GET", path: "/api/me", cookie })).status).toBe(401);
    const files = fs.readdirSync(path.join(root, "projects"));
    expect(files.length).toBe(0);
  });

  it("rejects cross-site origins and oversized bodies; audit log records events", async () => {
    const api = apiFor();
    const evil = await api.handle({
      method: "POST", path: "/api/auth/login", ip: "11.11.11.11",
      origin: "https://evil.example.com", body: { email: "x", password: "y" },
    });
    expect(evil.status).toBe(403);
    const big = await api.handle({
      method: "POST", path: "/api/projects", ip: "12.12.12.12",
      body: { title: "x", doc: { blob: "z".repeat(2_500_000) } },
    });
    expect(big.status).toBe(413);
    const s = await api.handle({ method: "POST", path: "/api/auth/signup", ip: "13.13.13.13", body: { email: "i@y.co", handle: "ivy", password: "long enough pw" } });
    expect(s.status).toBe(201);
    const audit = fs.readFileSync(path.join(root, "audit.jsonl"), "utf8");
    expect(audit).toContain("signup");
    expect(audit).toContain("ivy");
    expect(audit).not.toContain("long enough pw");
  });
});
