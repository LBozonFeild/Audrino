import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");

const simCompilePlugin = {
  name: "audrino-sim-compile",
  configureServer(server: {
    middlewares: {
      use(
        path: string,
        handler: (req: { method?: string; on: (e: string, cb: (d?: Buffer) => void) => void }, res: {
          setHeader(k: string, v: string): void;
          end(b?: string): void;
          statusCode: number;
        }) => void,
      ): void;
    },
  }) {
    server.middlewares.use("/api/sim/compile", (req, res) => {
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: "POST only" }));
        return;
      }
      const chunks: Buffer[] = [];
      req.on("data", (d?: Buffer) => {
        if (d) chunks.push(d);
      });
      req.on("end", async () => {
        res.setHeader("content-type", "application/json");
        try {
          const { compileSketch } = await import("../../packages/sim/src/toolchain");
          const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
            sketch: { main: string; files: Record<string, string> };
          };
          const r = compileSketch(body.sketch);
          res.end(JSON.stringify({ hex: r.hex, kind: r.kind, ms: r.ms, cached: r.cached }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
        }
      });
    });
  },
};

const aiProxyPlugin = {
  name: "audrino-ai-proxy",
  configureServer(server: {
    middlewares: {
      use(
        path: string,
        handler: (req: { method?: string; on: (e: string, cb: (d?: Buffer) => void) => void }, res: {
          setHeader(k: string, v: string): void;
          end(b?: string): void;
          statusCode: number;
        }) => void,
      ): void;
    },
  }) {
    const mount = (route: "chat" | "doctor") => (
      req: { method?: string; on: (e: string, cb: (d?: Buffer) => void) => void },
      res: { setHeader(k: string, v: string): void; end(b?: string): void; statusCode: number },
    ) => {
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: "POST only" }));
        return;
      }
      const chunks: Buffer[] = [];
      req.on("data", (d?: Buffer) => {
        if (d) chunks.push(d);
      });
      req.on("end", async () => {
        res.setHeader("content-type", "application/json");
        try {
          const { handleAiRequest } = await import("./src/server/ai-proxy");
          const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          const r = await handleAiRequest(route, body);
          res.statusCode = r.status;
          res.end(JSON.stringify(r.json));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
        }
      });
    };
    server.middlewares.use("/api/ai/chat", mount("chat"));
    server.middlewares.use("/api/ai/doctor", mount("doctor"));
  },
};

const accountsPlugin = {
  name: "audrino-accounts",
  configureServer(server: {
    middlewares: {
      use(
        path: string,
        handler: (req: {
          method?: string;
          url?: string;
          headers: Record<string, string | undefined>;
          socket?: { remoteAddress?: string };
          on: (e: string, cb: (d?: Buffer) => void) => void;
        }, res: {
          setHeader(k: string, v: string): void;
          end(b?: string): void;
          statusCode: number;
        }) => void,
      ): void;
    },
  }) {
    // Mounted at /api AFTER sim+ai plugins: it only sees unmatched /api/* routes.
    server.middlewares.use("/api", (req, res) => {
      const chunks: Buffer[] = [];
      let size = 0;
      req.on("data", (d?: Buffer) => {
        if (!d) return;
        size += d.length;
        if (size <= 2_100_000) chunks.push(d);
      });
      req.on("end", async () => {
        res.setHeader("content-type", "application/json");
        try {
          const { createAccountsApi } = await import("./src/server/accounts");
          const api = createAccountsApi({ rootDir: path.join(repo, "cache", "accounts") });
          const raw = Buffer.concat(chunks).toString("utf8");
          const body = raw ? JSON.parse(raw) : null;
          const r = await api.handle({
            method: req.method ?? "GET",
            path: `/api${req.url ?? ""}`,
            body,
            cookie: req.headers.cookie,
            origin: req.headers.origin,
            proto: String(req.headers["x-forwarded-proto"] ?? "").split(",")[0] || undefined,
            ip: (req.headers["x-forwarded-for"] ?? "").split(",")[0] || req.socket?.remoteAddress || "local",
          });
          for (const [k, v] of Object.entries(r.headers ?? {})) res.setHeader(k, v);
          res.statusCode = r.status;
          res.end(r.status === 204 ? "" : JSON.stringify(r.json ?? {}));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
        }
      });
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), simCompilePlugin, aiProxyPlugin, accountsPlugin],
  resolve: {
    alias: [
      { find: /^@audrino\/schema$/, replacement: path.join(repo, "packages/schema/src/index.ts") },
      {
        find: /^@audrino\/schema\/fixtures\/(.*)$/,
        replacement: path.join(repo, "packages/schema/fixtures/$1"),
      },
      { find: /^@audrino\/(.*)$/, replacement: path.join(repo, "packages/$1/src") },
    ],
  },
  server: {
    host: true,
    allowedHosts: [".e2b.app", "localhost"],
  },
});
