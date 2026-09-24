# M0 — Editor Skeleton: Repository & File Specification

**Parent:** `PLAN.md` §15 (M0) · **Status:** build order — implement exactly this, nothing more
**Demo in one line:** spawn "blink" from the mock AI → drag parts → inspect nets → undo/redo → copy/paste → all validated live against the DSL.

## 1. Goal / non-goals

**M0 delivers:** monorepo skeleton · net-based DSL types + validator (§5.4) + fixtures · static
SVG canvas + palette + Monaco (via `CodeEditor` interface) · mock sim badge · mock AI spawner
with build-card UX · undo/redo + copy/paste/duplicate · Vercel preview.

**Explicitly NOT in M0:** real compilation, real AI, Supabase, QEMU, auth, mechanical sim,
net engine/junctions, lint, 3D scaffolding, `packages/parts|libraries|sim-core|ai-orchestrator|render`
(real versions — M0 uses inline stubs where the UI needs them).

## 2. Commands

```bash
pnpm install     # or npm install (both supported; CI uses pnpm)
pnpm dev         # web on :5173, zero keys, mock everything
pnpm test        # vitest: schema validator + invariants + fixtures
pnpm build       # typecheck + web production build (what Vercel runs)
```

## 3. Exact file tree (M0 scope — no other source files)

```text
Audrino/
├── package.json                 # workspaces: apps/*, packages/*; scripts: dev/test/build
├── pnpm-workspace.yaml          # packages: apps/*, packages/*
├── tsconfig.base.json           # strict TS, bundler resolution, path aliases @audrino/*
├── .gitignore                   # node_modules, dist, .vercel, coverage, *.local
├── docs/M0-SPEC.md              # this file
├── packages/schema/             # THE contract: DSL types + validator + fixtures + tests
│   ├── package.json             # name @audrino/schema; exports ./src/index.ts
│   ├── tsconfig.json
│   ├── README.md                # §5.4 invariants restated as test names
│   ├── src/index.ts             # re-exports only
│   ├── src/types.ts             # Project, Board, Component, Net, Wire, Mechanics,
│   │                            # CodeFiles, BuildConfig, SimConfig, AiMeta, Transform,
│   │                            # PinRef, ProjectManifest (PLAN §5.1/§5.5)
│   ├── src/pinref.ts            # parsePinRef/formatPinRef (PLAN §5.4)
│   ├── src/validator.ts         # validateProject(): errors[] for invariants 1–8, 10;
│   │                            # invariant 9 (registry) skipped when no registry passed
│   ├── src/manifest.ts          # deriveManifest(project): ProjectManifest (PLAN §5.5)
│   ├── fixtures/blink.json      # uno + led + 220Ω + button-less blink (valid)
│   ├── fixtures/traffic-light.json  # uno + 3×led + 3×resistor (valid)
│   ├── fixtures/servo-arm.json  # uno + servo + arm body + revolute joint (valid)
│   └── tests/validator.test.ts  # fixtures pass; 8 crafted fixtures fail (one per invariant)
├── apps/web/                    # Vite + React + TS (Vercel target)
│   ├── package.json             # deps: react, zustand, @monaco-editor/react (mlater: tanstack query)
│   ├── vite.config.ts           # react plugin, @audrino/* aliases
│   ├── tsconfig.json
│   ├── index.html
│   ├── vercel.json              # { "$schema": …, "framework": "vite" } (explicit, minimal)
│   └── src/
│       ├── main.tsx             # createRoot, <App/>, global css import
│       ├── styles.css           # tailwind directives + css vars (bench theme)
│       ├── App.tsx              # §11 layout: Topbar | Palette | Canvas | RightPanel tabs
│       ├── state/store.ts       # zustand: doc, selection, tool, history{undo,redo},
│       │                        # clipboard, ui{activeTab, mockRun}; every mutation is a
│       │                        # validated transaction (PLAN §9.2 invariant, local form)
│       ├── state/ops.ts         # pure op appliers: add/move/remove, connect/disconnect,
│       │                        # paste, duplicate — each returns {doc} or {error}
│       ├── dsl/load.ts          # fixture loader + validateProject gate + manifest derive
│       ├── canvas/Canvas.tsx    # SVG layer: boards/components as rects, nets as
│       │                        # polylines (one color per net), selection, drag-move,
│       │                        # click-pin→ghost-wire→click-pin (creates net+wires),
│       │                        # net hover-highlight, minimap: none (later)
│       ├── canvas/PartGlyph.tsx # M0 stub visuals: labeled boxes per component type
│       │                        # (real PartVisual/wokwi-elements in M1+)
│       ├── palette/Palette.tsx  # static lists: Boards / Parts / Shapes(disabled w/ "M2")
│       ├── editor/CodePanel.tsx # CodeEditor interface + MonacoAdapter; file tabs (read
│       │                        # from doc.code.files); edits commit as transactions
│       ├── editor/CodeEditor.ts # interface { value, onChange, markers } — PLAN patch: swappable
│       ├── serial/SerialPanel.tsx   # M0: static "press Run in M1" placeholder + echo box
│       ├── ai/MockAiPanel.tsx   # prompt box + starter cards; "spawn" matches a fixture,
│       │                        # shows build card (PLAN §9.4) → [Open in editor] applies
│       │                        # it as ONE undoable transaction
│       ├── inspect/InspectPanel.tsx # read-only §11 panel: props, nets per pin (no LIVE in M0)
│       └── topbar/Topbar.tsx    # name, board badge, mock Run (toast "M1"), Share (copies JSON)
└── firmware/examples/           # (M1; M0 keeps .ino content inside fixtures only)
```

## 4. Data contracts (M0)

- **Project JSON:** `dslVersion: 2`, mm coordinates, `rotation_deg`, `size_mm`, `render_fps`
  (never `tickHz`). Every load/save/undoable-op runs `validateProject`; invalid states are
  unrepresentable in the store (ops return errors instead).
- **Mock spawn:** `{ prompt } → { buildCard: {title, board, parts[], wiring[], codeRef, why},
  project: Project }`. Matching: keyword→fixture (`blink|traffic|servo`, default blink).
- **History:** `past: Project[] (cap 100), future: Project[]`. Undo/redo restores snapshots;
  any new op clears `future`. [Open in editor], paste, duplicate, wire, move, code-edit all push.
- **Clipboard:** `{ components: Component[], nets: Net[] (pins remapped to copies), wires: Wire[] }`
  with fresh IDs on paste (`<id>-copy-<n>`), offset +20mm. Duplicate = copy+paste selection.

## 5. Canvas interaction spec (M0)

Tools: `select · inspect · wire · delete` (weld/probe arrive M2/M1). Behaviors:
- Palette click (or drag) → ghost follows → click canvas places at snapped mm point.
- Drag part → move transaction on pointer-up (live ghost during drag).
- Wire tool: click pin-dot → ghost polyline → click second pin-dot → creates/extends net +
  one `wires[]` segment; ESC cancels. Hovering a net highlights all its segments + member pins.
- Click part with inspect tool (or double-click) → InspectPanel shows it.
- Delete key removes selection (components + their nets' pins; empty nets pruned) — undoable.
- Canvas is pure SVG (`<svg>` + `<g>`), no canvas-element, no third-party graph lib (per PLAN §4.3).

## 6. Acceptance checklist (M0 demo script — all must pass)

1. `pnpm install && pnpm test && pnpm build` green on a fresh clone.
2. `pnpm dev` → layout matches PLAN §11 (topbar/palette/canvas/code-serial-AI tabs).
3. Type "traffic light" in AI panel → build card appears → [Open in editor] → 3 LEDs + resistors on canvas (one undo step reverts all of it).
4. Drag LED, wire D10→resistor, hover net → whole net highlights; validation errors (if forced) show inline, never crash.
5. Ctrl+Z / Ctrl+Y unwind/redo wire + move + spawn; Ctrl+C/V/D duplicate an LED+resistor pair with fresh IDs.
6. Code tab edits `sketch.ino`; switching tabs preserves state; Topbar Share copies valid project JSON.
7. Deployed Vercel preview URL renders the same (no env vars, no Functions yet).
8. No file outside §3 tree exists in the diff (except lockfile); no `TODO: M0` leftovers.

## 7. M1 hooks (prepare, don't implement)

- `validator.ts` signature stays stable — M1 adds registry param for invariant 9.
- `SimEvent` union (PLAN §7.3) will land in `packages/sim-core`; M0 canvas must not invent a rival event shape (mock Run only toasts).
- `PartGlyph` props mirror the future `PartVisual` interface (`{ def, state }`) so M1 swaps visuals without touching `Canvas.tsx`.
