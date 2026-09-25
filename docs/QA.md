# QA & Golden-Test Harness

The trust layer. "Never invents data, never silently changes it."

## Suites

| Suite | Where | Guards |
| --- | --- | --- |
| `golden-pinouts.test.ts` | packages/schema/tests | Datasheet-frozen pin maps (555, TL071, LM324/339, 328P, TO-92/TO-220 discretes, regs, EEPROMs, sensor modules) + family parametrics |
| `validator.test.ts` | packages/schema/tests | Fixture docs + invariants inv1–inv10 (dup pins, dangling refs, bare units…) |
| `parts.test.ts` | packages/schema/tests | Catalog shape, bbox geometry, frozen M0 ids, breadth floor (≥1000 types) |
| `family-invariants.test.ts` | packages/schema/tests | Clone geometry (74x ≡ prefixes, 4000-series), DIP geometry classes, prop sanity |
| `golden-sim.test.ts` + `tests/golden/simFixtures.ts` | packages/schema/tests | Sim outcome goldens (serial stamps + analog probe values). Format-validated now; **M1 runs them against the emulator and refuses to ship on deviation** |
| `art-coverage.test.ts` | apps/web/tests | Every catalog type paints real art (never the fallback box) |
| `themes.test.ts` | apps/web/tests | Theme completeness, hex validity, WCAG contrast floors (fg 4.5:1, secondary 3:1) |
| `app.test.tsx` | apps/web/tests | Interaction goldens: place/search/history/delete guardrails/pin tooltips/inspect |

Run: `npm test` (both workspaces), plus `npm run typecheck && npm run build`.

## Data policy

- Pinouts come from manufacturer datasheets. Uncertain pinout ⇒ numeric pin
  ids only, or the part is dropped. Never guess, never invent.
- Golden entries document their source class in the test header. Changing a
  golden requires citing the datasheet revision in the commit.

## Known deliberate simplifications

- **arduino-uno** ships the M0 *working subset* of headers: `D0–D13`,
  `A0–A5`, `VIN GND 5V 3V3 RST` (ids frozen for fixture compatibility). The
  physical R3 adds `IOREF`, `AREF`, `SDA`, `SCL` and extra `GND`s — M1 board
  upgrade is **additive** (existing ids never move).
- **Module header order** (lcd1602-i2c backpacks, mpu6050 GY-521, bmp280
  breakouts) is vendor-specific; goldens assert the pin *set* and local order
  we model, not a universal truth. mpu6050 models the 4-pin I2C subset of the
  8-pin GY-521 header.
- **DHT11/DHT22** model the common 3-pin modules (VCC/DATA/GND), not the
  4-pin bare sensors.
- **2N3055** exposes its case as pin `C` (the TO-3 can is the collector).

## Sim golden contract (M1)

`tests/golden/simFixtures.ts` fixtures declare: a board + component refs with
catalog types, a netlist (component:pin pairs), a sketch, and expectations —
`expect.serial` (lines at ms stamps) and/or `expect.analog` (probe voltages
with tolerance). The M1 runner replays each golden and compares. Digital
first, **real analog** (MNA-style solver) checked via `expect.analog` —
e.g. the `rc-divider` golden pins the 2.5 V midpoint of a 1k/1k divider.


## M1 round (simulation core + live Run)

Chain: **100/100 tests** (schema 70 + sim 11 + web 19) + typecheck clean (3 packages).
`SIM_GOLDENS` (blink-uno serial deadlines + rc-divider 2.5 V) green on the engine;
Run button executes real firmware (compile middleware → worker → co-sim).

Defects root-caused and fixed this round (each now covered by a test/guard):

1. `--gc-sections` with no entry symbol produced a silently **empty image**
   (blink2.elf "linked" with zero code). Fix: `ENTRY(__vectors)` + `-Wl,-e,__vectors`
   + KEEP(.vectors) + a post-link empty-image guard in `toolchain.ts`.
2. lld's implicit layout defines **none** of the crt symbols; `zig objcopy` 0.16 has
   no ihex; split `.o` linking collides with LLVM-ARV's per-TU `__data_start`-style
   markers. Fix: `core/atmega328p.ld` + one-shot compile+link + ELF PT_LOAD parse.
3. `__data_end = ADDR(.data)` = section **base** ⇒ copy loop ran 0 iterations
   (empty strings on UART, dead PIN_DEFS/GPIO). Fix: location-counter symbols.
   Golden symptom pair: UART emitting only `\r\n`, `pinState` stuck at Input.
4. clang-avr generic `const char*` is SRAM-deref'd (`LD`) ⇒ `.rodata` must live at
   RAM VMA and be copied (LPM) — the flash-VMA experiment was a dead end.
5. avr8js `cpu.tick()` only services clock events — instruction stepping is
   `avrInstruction(cpu)` (plus `tick()` per instruction).
6. `setup/loop` need `extern "C"` in the sketch wrapper (core.cpp C linkage).
7. Wire-merged board-GND groups must resolve to node 0 (`ADDR`-style split made
   the rc divider read 5 V).
8. digitalWrite→digitalRead races a frame-based solver: GPIO register write-hooks
   must re-solve + feed inputs between instructions.

Verified lessons kept: zig needs BOTH `-mmcu` + `-mcpu=atmega328p`; all sources in
one link invocation; ld script must use `.` (not `ADDR()`) for end symbols.

Sim golden contract (restated for tests): `serial` entries are **deadlines**
(`line i arrives by sim-time ms_i`, in order); `analog` probes are `component:pin`
node voltages at `at_ms` (0 = t=0 solve).

### M1 acceptance closure (same round)

"LED/pin state on canvas" completed: the engine emits change-driven `SimLiveState`
(`onState`) through the worker; `SimProvider` stores `leds`/`pins`; `PartGlyph`
renders the LED glow from live state and `Canvas` colors pin-dots
(`st-high`/`st-low`/`st-pullup`/`st-z`); Reset clears both. Golden: app.test
"canvas sim state" places board+LED and asserts glow + pin classes appear and
clear. Also closed: dead `mockRun` store API removed; `installParts` now keys
pins by **id** (nets/`ref:pinId` are id-based; names alias to ids) — a latent
break for schema-installed defs; `mna.test` pull-down switch rewritten honestly
(caught a backwards-source wiring in the new fixture itself).


---

## QA round — perf-at-scale (2026-09-24)

_Reviewed against the "1000+ parts & hundreds of wires at 60fps" acceptance bar and the perfectionist standard._

| Check | Result |
|---|---|
| Canvas layer | ✅ SVG viewBox pan/zoom (k 0.15–8, wheel zoom-at-cursor with anchor invariant `(wx−x)·k` preserved under test, middle-drag pan), viewport culling for parts AND wires (rotation-safe `m=max(w,h)` + 90 margin), memoized `PartGlyph` + `WireRow` (one memo row per wire — hover preserved), pin dots LOD-hidden below k=0.55 |
| World size | ✅ 4096×3072 mm world (bounds/ops updated; palette untouched) |
| Engine clustering | ✅ `ClusteredSolver`: ground-aware partition (elements sharing non-zero nodes ⇒ independent small MNA systems); `markDirty` per cluster on pinMode changes; dirty-cluster re-solve only; parity vs monolithic `MnaSolver` at 1e-12 |
| **Latent bug found & fixed** | 🔴→✅ `ClusteredSolver` first copied remapped elements — mutations to the ORIGINAL (`applyPinMode` toggling `active/closed`) would never reach the solver (blink's pin drive would silently break). Caught by the dirty-parity test before push; fixed with param sync (`Object.assign`, local node ids kept) at every solve |
| Perf goldens | ✅ `tests/perf-scale.test.tsx`: 1000 resistors + 300 wires ⇒ <120 parts / <80 wire-groups / <400 pin-dots rendered at default view + LOD/zoom-anchor invariants (assertions scoped to `svg.canvas-svg`; palette previews legitimately render ~156 `g.part`) |
| Chain | ✅ `npm run test:chain` **105/105** (schema 70 + sim 14 + web 21), `npm run typecheck` 0 — verified by re-run after a scripting gap (a silently-dropped root script meant an earlier "chain" claim was unverified; `test:chain` restored and re-proven) |


---

## QA round — sim-aware AI repair (2026-09-24)

_Reviewed against PLAN §9.4 (local-first assistant + repair loop) and the perfectionist standard._

| Check | Result |
|---|---|
| Local-first Ollama | ✅ browser-direct to `http://127.0.0.1:11434` (configurable URL) by default + “via app server” toggle for self-hosted topologies; doctor failure carries actionable `OLLAMA_ORIGINS`/`ollama serve` guidance (tested) |
| BYOK cloud proxy | ✅ `POST /api/ai/chat` + `/api/ai/doctor` on the vite backend (`src/server/ai-proxy.ts` — pure handler, unit-tested with mock fetch): openai / anthropic / openai-compatible; keys transit the request body, are used for the outbound call, and are **never logged, echoed, or persisted server-side** (asserted: key absent from reply JSON). Client keeps keys in `localStorage` only with “Forget keys” |
| Connection doctor | ✅ model list + latency; **slow-model warning >2s** (“try qwen2.5-coder:3b”); unreachable endpoints return structured `ok:false` (live curl on :5173 verified) |
| Repair loop | ✅ sim error auto-attaches (chip) + free-text symptom + optional serial/pin snapshot → structured prompt (board, netlist, full sketch, error/symptom/context) → `parseFix` (bare JSON / fenced json / fenced sketch / bare sketch / brace-blob — prose-only rejected) → unified diff preview → **Apply fix** (`setCode`, one undo reverts) → optional auto re-run; attempt counter; Reject clears |
| UI | ✅ AI tab: Quick-start fixtures preserved from the M0 mock panel (deleted as dead code), model picker with doctor datalist, diff view, help footer with key-safety + Ollama setup |
| Serial hook | ✅ “✨ Fix with AI” on the error line jumps to the AI tab with the error attached |
| Chain | ✅ `npm run test:chain` **117/117** (schema 70 + sim 14 + web 33 — 12 new AI tests incl. the end-to-end Apply+undo flow), `npm run typecheck` 0 — before commit |


---

## QA round — autosave / share / wokwi / accounts (2026-09-24)

_Reviewed against PLAN §11.4 (share = snapshot link), §12.1–12.2 (accounts + protection), Wokwi interop, and the perfectionist standard._

| Check | Result |
|---|---|
| Autosave | ✅ debounced localStorage (`audrino-autosave-v1`), restore-on-boot with trivial-scaffold detection, "⟳ New project" clears deliberately |
| Share links | ✅ `#p=v1z.<deflate-raw>` (plain `v1p.` fallback without CompressionStream), 30k token cap → falls back to JSON copy with an honest message; hash-load on boot; validateProject gate on decode |
| Wokwi interop | ✅ import/export for the confident core set (uno/nano/esp32, led/rgb, resistor, capacitor, diode, pot, pushbutton, slide-switch, servo, buzzer, dht11/22, hc-sr04, 74hc595, ssd1306, neopixel) with **name-based pin aliases**; unmapped parts/connections warn (never silent); round-trip golden; value parsing (Ω/µF) |
| **Electrical semantics (tested)** | Wokwi endpoints merge per CONDUCTOR: shared pin keys union (GND.1/GND.2 → our single GND rail; pushbutton 4-leg terminals collapse to 2 pins) while series parts never collapse — the importer's union-find is over wire endpoints only |
| Accounts (§12.1 shape) | ✅ `POST /api/auth/{signup,login,logout,logout-all}`, `GET/PATCH/DELETE /api/me`, `GET /api/me/export`, `GET/POST /api/projects`, `GET/DELETE /api/projects/:id` — live curl verified (cookie → me → save) |
| Protection (§12.2) | ✅ scrypt N=16384 + per-user salt + timingSafeEqual (plaintext never on disk — tested); 256-bit session tokens stored SHA-256-hashed in HttpOnly SameSite=Lax cookies (+Secure on https); logout-everywhere revokes all; per-IP rate limits (signup 5/h, login 10/5min, general 120/min); 2 MB body cap (413); strict input validation + control-char strip + length caps + minimal slur blocklist; Origin allowlist (403 cross-site); daily save quota (429, UTC reset); append-only audit log (no secrets); export excludes hash/salt/sessions; delete-account wipes user + projects + sessions |
| Documented tier gap | Local tier auto-verifies at signup (no SMTP); `verified` flag + gates exist for managed auth (§12.1). Storage is single-process file-based (`cache/accounts/`, gitignored) — multi-instance + Postgres/RLS = managed tier (§13) |
| Chain | ✅ `npm run test:chain` **137/137** (schema 70 + sim 14 + web 53 — 20 new: accounts-api 10, share 3, wokwi 3, account-ui 4), `npm run typecheck` 0 — re-verified after a sandbox `node_modules`/`ziglang` prune forced `npm ci` + `pip install --break-system-packages --user ziglang` |


---

## QA round — probes / scope / teaching (2026-09-24)

_Reviewed against PLAN's instrument/teaching goals and the perfectionist standard._

| Check | Result |
|---|---|
| Trace engine | ✅ `RunRequest.trace {pins, strideMs}` + `onTrace` hook — fixed-stride `ProbeSample{probe, atMs, v}` streamed from the co-sim loop (`probeNode` resolution cached per run); unknown probe keys stream **NaN, never silent** (tested); golden: blink @0.5 ms/3 s ⇒ exactly 6001 samples/channel, monotonic time, 5V rail accurate, D13 shows both levels + first second high |
| Scope + logic analyzer | ✅ Scope tab: digital lanes as step waves (>2.5 V = high), analog lanes with 0/2.5/5 V grid, shared time axis with ms ticks, hover cursor + per-channel voltage readout (`nearestSample` binary search), probe picker over every catalog pin of placed parts, per-lane D/A toggle, 8-channel cap with friendly error, ring buffer 6000 samples/channel, channels persist (`audrino-trace-v1`) |
| Teaching | ✅ 3 lessons on the real fixtures with declarative CheckSpecs (`simRan`, `serialIncludes`, `probeAdded`, `pinToggled`, `pinLevel`, `ledLit`) evaluated live against sim + trace state — steps tick ✓ only when the circuit really did the thing. Blink (first toggle), Traffic light (observe green phase), Two-channel logic analysis (fixture + alternating firmware — complementary squares). Progress persists; completion toasts |
| Honest scope cut | Servo-arm lesson skipped: the fixture's `#include <Servo.h>` is not in the shim core (M2 library support) — a lesson must never dead-end on a compile error. Two-channel lab teaches the instrument better anyway |
| Chain | ✅ `npm run test:chain` **149/149** (schema 70 + sim 16 + web 63 — 12 new: trace 2, learn 6, scope-ui 4), `npm run typecheck` 0 (after fixing a worker `trace` shorthand that a parallel verify had raced past) |

---

### Round: AI circuit generation (semantic spawn + build card)

**QA pass** 2026-09-25 — `dsl/netsFromConnections` + `dsl/spawn` + `SpawnSection`; wokwi refactored onto the shared net/wire builder (behavior-preserving).

| Area | What shipped | Verification |
|---|---|---|
| `netsFromConnections.ts` | Shared `buildNetsAndWires(pairs, entities)` + `pinWorldPos` (rotation-aware world pin positions) — one series-safe union-find implementation for both Wokwi import and AI spawn; wires = straight pin-to-pin chains per net (pins−1) | wokwi tests 3/3 still green after refactor; spawn blink golden = 3 nets/3 wires |
| `dsl/spawn.ts` | `parseSpawn` (bare JSON → fenced ```json → brace blob; rejects prose-only) + `buildSpawnProject`: semantic pins/refs (no mm), auto-layout (board left, parts grid), pin resolution by id **or** name (case-insensitive), value parsing (220/4.7k Ω, 10uF, "red"), unknown types/pins degrade to warnings (never throw), **`validateProject` gate before display**, build-card meta `doc.ai{bom,wiringSteps,explanation}` + auto sketch; `buildSpawnMessages` + `coreCatalogDigest()` (~54 core types with pin ids/names) so the model designs from the real catalog | 5 unit tests: parse ladder ×3, blink golden (refs/props/nets/wires/meta), degradation, aliases |
| `SpawnSection` | Prompt + example chips (chips FILL the input), Generate → model → card (title, board, part count, BOM, wiring steps, explanation, warnings) → **Open in editor** (`loadProject` = one undo reverts all) / Discard. **One self-repair retry** feeds `validateProject` errors back to the model (test asserts the error reaches the request body). No model → honest error ("configure a model…"); model garbage → real error, never a silent fixture | spawn-ui 2/2: generate→card→open→undo golden; garbage×2 → error + 2 fetches + busy cleared |
| AiPanel | Mock Quick start (`matchFixture`) REMOVED — Learn tab owns offline demos; AI tab owns model work | ai tests 7/7 green |

**Design rules enforced by `buildSpawnMessages`:** model returns semantic JSON only (no millimeters — layout is ours); `board1` is implicit (never in parts); every LED gets a 220–330Ω series resistor in the spec; names/refs arbitrary.

_Chain_ **156/156** (schema 70 + sim 16 + web 70: spawn 5 + spawn-ui 2 + existing 63) · _typecheck_ 0.

_Live fixtures kept:_ `importWokwiDiagram` asserts unchanged (series kept, pin merges correct) after the shared-builder refactor.

---

### Round: photoreal part art + real breadboards (170/400/830)

**QA pass** 2026-09-25 — canvas art depth + true solderless-breadboard models with internal strip connectivity; Topbar history/fit.

| Area | What shipped | Verification |
|---|---|---|
| `ArtDefs` (PartGlyph) | Shared photoreal materials: steel/brass/black/Abs/ceramic/can gradients, 6 radial **epoxy LED domes**, `matLift` drop-shadow — mounted once per canvas (document-scoped url refs) | typecheck 0; LED + resistor rebuilt on them |
| Part art | LED: radial dome + rim + flange + internal anvil/bond + specular (per-color domes). Resistor: ceramic gradient, **steel end caps**, value-coded bands (existing `bandCodes`) + sheen | existing art tests still green |
| Breadboards | `breadboard-170` (17×10 = 170), `breadboard-400` (30×10 + 4×25 rails = 400), `breadboard-830` (63×10 + 4×50 split rails = 830) — 2.54 mm pitch, a–j rows, `nt/pt/pb/nb` rail strips; art: molded ABS + bevel + center channel + recessed sockets with clip glints + red/blue rail stripes with +/− marks + column numbers + row letters + lift shadow | schema 3 tests: exact counts 170/400/830, bridge groups (17 / 34 / 71), split-rail isolation |
| **Strip connectivity (`bridges`)** | `PartDefinition.bridges?: string[][]` (column tie-points, rail halves) + `bridgeMatesOf()`. Wired into **all three net paths**: `buildNetsAndWires` (import/spawn), `connect()` (live editing — bridge-aware net lookup + multi-net absorb), `mergeNetsByBridges()` in `projectToCircuit` (sim gets one node per strip even for pre-fix docs) | web 5 tests: import merge golden (4-pin net, wires pins−1), separate columns stay separate, `connect()` merges + relabels wires to one net, sim merge repair, spawn aliases |
| Spawn | `breadboard`→400, mini-breadboard→170, half→400, full→830 aliases + in core catalog | alias golden |
| Topbar | ↶ Undo / ↷ Redo (history-aware disabled states) + ⊡ Fit (`viewStore.resetView`) | typecheck 0 |

_Chain_ **164/164** (schema 73 + sim 16 + web 75) · _typecheck_ 0.

_Notes:_ wire casing/sag/hot-net highlight and wheel-zoom preventDefault were already in place (verified, kept). Rail naming: top edge − then + (MB-102 silkscreen convention); 830 rail rows split at center into 2×25-hole halves (true MB-102 topology). Follow-ups: photoreal shading for the remaining batch-art long tail, k-LOD socket collapse on breadboards at low zoom.

---

### Round: UNO R3 photoreal silkscreen + square wiring spots + always-on labels

**QA pass** 2026-09-25 — user ask: "uno has rx and tx but i cant see them… spots for wiring like square as in real life including the labels that i can view without hovering" (with the official UNO R3 render as reference).

| Area | What shipped | Verification |
|---|---|---|
| UNO R3 pinout | Full real-board headers at **2.54 mm pitch**: top `AREF GND 13…TX→1 RX←0` (D0 rightmost, real order), power `IOREF Reset 3V3 5V GND GND Vin`, analog `A0–A5` right-aligned. Ids kept (D0-D13/A0-A5/VIN/GND/5V/3V3/RST); added `AREF, IOREF, GND1, GND2` (all /^GND/i unify to ground in netlist). D-names = real silk numbers ("0"…"13") | schema `uno-r3.test.ts` ×2 (29 pins, pitch, full order) + golden-pinouts freeze AMENDED to documented-superset (M0 ids immutable + VIN/RST names frozen + R3 additions listed) |
| UNO art | TX/RX/L/ON status LEDs with silk labels, red reset actuator, USB-B shell/tongue/gold contacts, DIP-28 with 14 legs/side + notch + pin-1 dot, 16.000 crystal, ICSP + label, MEGA16U2/regulator/SMD clusters, ∞ ARDUINO + UNO oval logo, group captions DIGITAL (PWM ~)/POWER/ANALOG IN, per-pin silk names, ~ under PWM pins, TX→/RX← arrows | typecheck 0; chain green |
| Square wiring spots | `SquareHole` female-header sockets (gold rim + square bore + clip) in every `Header`; breadboard sockets square recesses; canvas `pin-dot` circles → rounded **squares** (class kept for goldens) | chain green (DOM goldens unchanged classes) |
| Labels without hover | Canvas `<text class="pin-label">` beside every pad (≤40-pin parts), `pinLabel(id,name)` rule = short name else id (shows "0","Vin","GND","Anode"); boards carry real silkscreen in art (`PinSilk` on Nano/ESP32/NodeMcu/Pico; Uno has its own full silk); tooltip `<title>` retained as extra | `pin-label.test.ts` (7 cases) |
| Tooling triage | sim 8/16 failures were the vanished pip ziglang (twice) — reinstalled **system-wide** (`pip install --break-system-packages ziglang`, probe `python3 -m ziglang version`) | sim 16/16 after restore |

_Chain_ **167/167** (schema 75 + sim 16 + web 76) · _typecheck_ 0.

_Freeze contract note:_ `golden-pinouts.test.ts` UNO block now documents the evolution — additions append to `FROZEN_UNO_IDS`/`R3_ADDITIONS`, renames of frozen ids or VIN/RST names are forbidden. Wokwi/sim/fixtures unaffected (id-first resolution; fixtures carry nets, no wire geometry).

---

### Round: pitch-safe pads + Tinkercad depth pass

**QA pass** 2026-09-25 — user feedback: "the squares hitboxes are too big so they overlap and increase the detail even further just like tinkercad".

| Area | What shipped | Verification |
|---|---|---|
| Pad geometry | Visible socket shrunk to **1.9 mm** (gold rim + dark bore via CSS) and made inert; separate transparent **2.4 mm hit box** carries the click + tooltip — strictly under the catalog's 2.54 mm minimum pitch, so neighbors can never overlap (was 4.4/6 mm squares colliding on headers) | `pin-label.test.ts` geometry golden: `PIN_PAD_S < PIN_HIT_S < 2.54` |
| Tinkercad name plates | Every non-board part prints `ref · value` below it (`partNameLabel`: 220Ω / 4.7kΩ / 1MΩ, 100nF/µF, color) — always visible, halo-stroked `.part-label` | unit golden ×6 formats |
| Universal depth | Every part art wrapped in `matLift` contact shadow at the glyph root (breadboard's inner wrapper deduped) — consistent "sitting on the workplane" look | typecheck 0 |
| Workplane grid | Tinkercad-style 5 mm grid + 25 mm majors (`matGrid`/`matGridMajor` patterns, theme-aware `--bench-fg-dim`), world-space so it pans/zooms with the view | renders under parts/wires |
| Board detail | White silkscreen outlines around every header strip (real boards print them); faint copper traces under the UNO solder mask | visual |
| Phantom test error fixed | `workerSimRunner` threw uncaught `Worker is not defined` in jsdom (vitest "Unhandled Errors") — now a clean `hooks.onError` + no-op `SimRunJob` | chain runs with zero unhandled errors; tooltip golden re-pointed to `.pin-hit title` |

_Chain_ **169/169** (schema 75 + sim 16 + web 78) · _typecheck_ 0.

## Actual-designs alignment (truth to the real boards) — 2026-09-25

- User flag: the art had drifted from the real designs. Restored fidelity (and the
  saved-design protection the pin moves require):
- **UNO R3 = the genuine layout**: 31 pins — digital header now SCL,SDA,AREF,GND
  then 13…0 (R3's extra pair), POWER block at the shield-standard x≈27.9
  (IOREF/Reset/3V3/5V/GND/GND/Vin), ANALOG IN at x≈50.8; drawing matches:
  reset top-left beside the USB, USB-B shell + tongue + contacts, white mounting
  holes at the true coordinates, L/TX/RX LEDs + ON LED, ∞ ARDUINO + UNO oval,
  16 MHz crystal can, ICSP 2×3 (round pins) center-left, ATmega328P DIP-28
  (35.5 mm, notch + pin-1 dot + legs) center-right, barrel jack bottom-left,
  `TX->1`/`RX<-0` silk (the real boards' marks), DIGITAL (PWM ~) + POWER +
  ANALOG IN captions, ~ marks on 3/5/6/9/10/11.
- **Pin pads tell the truth**: gold sockets ONLY on real connectors (boards +
  breadboards); bare leads get subtle dots (no invented sockets on LEDs/ICs).
- **Saved designs survive pinout corrections**: `relayoutWires` re-lands saved
  wire endpoints onto the nearest current pins of their net (topological
  `ref:pinId` — never electrical) at every `loadProject` entry (autosave, share,
  remote docs, AI, lessons). Interior waypoints preserved. Tested.
- Golden pinout freeze amended as superset (`R3_ADDITIONS` incl SCL/SDA).
- Chain 172/172 (schema 75 + sim 16 + web 81); typecheck 0 errors (tsc clean exit).

## Component scale + default zoom (Tinkercad-size parts) — 2026-09-25

- User: "increase the size of the components". Two levers, both shipped:
- **Default/reset zoom k 1 → 2.5** (viewStore): the view showed 720 mm across
  at k=1 — parts rendered postage-stamp size. Now ~288 mm across: a UNO fills
  ~24% of the canvas width, Tinkercad-like. Only perf-scale.test pins k
  explicitly; no golden asserted the old default.
- **Body-art growth pass** (pins untouched — breadboard pitch contract held):
  resistor 13×5.4→16×7 body + chunkier bands; LED dome r3→3.9; RGB LED r3.4→4.1;
  ceramic cap +35%; electrolytic can 7×10.5→8.6×12.4; inductor 9×5→10.6×6.2;
  diode 6×3.2→7.2×4.2; LDR face r4.8→5.5; thermistor bead r2.5→3.3;
  pot body 10×10→11.2×10.4 + dial r2.8; TO-92 body →8×8; TO-220 tab/body
  →9.6 wide; pushbutton plate 9→10.4 + cap r3.4; toggle body →9.4×6.
  All within def bboxes; lead endpoints stay exactly on pin coords.
- Chain 172/172 (schema 75 + sim 16 + web 81); art render smoke (1000+ types)
  clean; typecheck 0.
- Env note: post-reset recovery this round = `git fetch origin arena/01a0c931-audrino`
  + `git reset --mixed FETCH_HEAD` + `git restore --worktree --staged .` +
  `npm ci` + `pip install --break-system-packages ziglang`.

## Component size pass 2 (bigger again) — 2026-09-25

- User: "increase the size of the components" (2nd ask) — everything reads bigger:
- **Default/reset zoom 2.5 → 3.5** (view ~206mm across; UNO fills ~1/3 of canvas).
- **Palette thumbnails 40×28 → 76×56px** (`.pal-glyph`) — parts read at picker scale.
- **Silk labels up**: `.pin-label` 1.8→2.4mm, `.part-label` 2.4→3.2mm.
- **Chip/transistor family factories grown** (shared by hundreds of catalog parts,
  missed in pass 1): `dip()` in partsArtBatch2 + partsArtExtra (body insets
  2.5/1.8→1.6/1.1mm, bigger notch/dot/silk), batch5 `dipArt` (insets→1.2/0.5),
  `to92` copies (body→8.2mm D-shape), `to220` copies (tab/body→9.6mm),
  batch5 `to92Art` (r 0.44w→0.52w) + `to220Art` (body→h*0.78). Pins unmoved.
- Chain 172/172 (schema 75 + sim 16 + web 81); art smoke clean; typecheck 0.
- Env: per-turn reset wipes node_modules + system zig — recovery = `npm ci` +
  `pip install --break-system-packages ziglang` (+ git fetch/reset/restore if
  the worktree re-clones).
