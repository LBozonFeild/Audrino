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
