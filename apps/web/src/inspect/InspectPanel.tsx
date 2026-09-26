import { partDef, parsePinRef } from "@audrino/schema";
import { useEditorStore } from "../state/store";

/** Read-only datasheet-lite panel (PLAN §11, M0 slice). */
export function InspectPanel() {
  const doc = useEditorStore((s) => s.doc);
  const selection = useEditorStore((s) => s.selection);

  const entity =
    doc.boards.find((b) => selection.includes(b.id)) ??
    doc.components.find((c) => selection.includes(c.id)) ??
    doc.mechanics?.bodies.find((b) => selection.includes(b.id)) ??
    null;

  if (!entity) {
    return (
      <div className="tab-body dim">
        <div className="card">
          <h4>Nothing selected</h4>
          <div className="dim">
            Click a part on the canvas — or double-click it to jump here for
            properties and net connections.
          </div>
        </div>
      </div>
    );
  }

  const eType = "type" in entity ? entity.type : "body";
  const def = partDef(eType);
  const props: Record<string, unknown> = (entity as { props?: Record<string, unknown> }).props ?? {};
  const netOfPin = (pinId: string) => {
    const pin = `${entity.id}:${pinId}`;
    return doc.nets.find((n) => n.pins.includes(pin))?.id ?? null;
  };

  return (
    <div className="tab-body">
      <div className="card">
        <div className="inspect-head">
          <h4 style={{ margin: 0 }}>{def?.label ?? entity.id}</h4>
          <span className="inspect-type">{eType}</span>
        </div>
        <div className="kv">
          <span className="k">id</span>
          <span>{entity.id}</span>
          <span className="k">position</span>
          <span>
            {entity.transform.x} , {entity.transform.y} mm
          </span>
          <span className="k">rotation</span>
          <span>{entity.transform.rotation_deg ?? 0}°</span>
          {"size_mm" in entity && entity.size_mm && (
            <>
              <span className="k">size</span>
              <span>{entity.size_mm.w} × {entity.size_mm.h} mm</span>
            </>
          )}
          {Object.entries(props).map(([k, v]) => (
            <span key={k} style={{ display: "contents" }}>
              <span className="k">{k}</span>
              <span>{String(v)}</span>
            </span>
          ))}
        </div>
      </div>
      {(def?.pins ?? []).length > 0 && (
      <div className="card">
        <h4>Net connections</h4>
        <div className="kv">
          {(def?.pins ?? []).map((p) => {
            const net = netOfPin(p.id);
            return (
              <span key={p.id} style={{ display: "contents" }}>
                <span className="k">
                  {p.id}
                  {p.name !== p.id ? ` · ${p.name}` : ""}
                </span>
                <span>
                  <span className={`net-pill${net ? " on" : ""}`}>{net ?? "unconnected"}</span>
                </span>
              </span>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}

/** Which net does "id:pin" belong to? */
export function netOfPinRef(nets: { id: string; pins: string[] }[], pin: string) {
  const ref = parsePinRef(pin);
  if (!ref) return null;
  return nets.find((n) => n.pins.includes(pin))?.id ?? null;
}
