# @audrino/schema — the Audrino project contract

Canonical DSL types + validator + derived manifest (PLAN §5). The web app, workers,
and AI gate all share this package: **invalid states are unrepresentable downstream.**

## §5.4 invariants → test names (`tests/validator.test.ts`)

| # | Invariant | Failing-test name |
|---|---|---|
| 1 | Every pin belongs to zero or one net | `rejects a pin in two nets (inv1)` |
| 2 | A wire segment belongs to exactly one net | `rejects a wire pointing at a missing net (inv2)` |
| 3 | A net cannot contain the same pin twice | `rejects a duplicated pin inside one net (inv3)` |
| 4 | IDs globally unique within a project | `rejects duplicate component ids (inv4)` |
| 5 | Every referenced pin exists on its `PartDefinition` | `rejects an unknown pin (inv5)` |
| 6 | Every net pin's component/board resolves | `rejects a dangling component reference (inv6)` |
| 7 | No mechanical attachment cycles | `rejects a joint self-cycle (inv7)` |
| 8 | Joint drivers reference a capable existing part | `rejects a joint driver pointing nowhere (inv8)` |
| 9 | Every `#include` resolves to the approved registry | `rejects unregistered includes when a registry is passed (inv9)` |
| 10 | Physical quantities use §5.3 suffix keys | `rejects bare unit quantities (inv10)` |

## M0 notes

- `M0_PIN_CATALOG` in `validator.ts` is a **stub** covering fixture types only
  (`arduino-uno`, `led`, `resistor`, `pushbutton`, `sg90-servo`). M1 replaces it with
  `packages/parts` (`PartDefinition` pin tables); nothing outside this package may
  import the catalog.
- Invariant 9 is **skipped when no registry is passed** (M0 fixtures carry no registry).
- `deriveManifest()` leaves `build_hash: ""` — populated by the compile pipeline
  (PLAN §4.5). M0 has no toolchain, so it never fabricates one.
