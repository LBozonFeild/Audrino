import { useMemo, useState } from "react";
import { PART_DEFINITIONS } from "@audrino/schema";
import type { PartCategory, PartDefinition } from "@audrino/schema";
import { PartGlyph, partSize } from "../canvas/PartGlyph";

const CATEGORY_ORDER: { id: PartCategory; label: string; hue: string }[] = [
  { id: "board", label: "Boards", hue: "var(--cat-board)" },
  { id: "module", label: "Modules", hue: "var(--cat-module)" },
  { id: "ic", label: "ICs", hue: "var(--cat-ic)" },
  { id: "semiconductor", label: "Semiconductors", hue: "var(--cat-semiconductor)" },
  { id: "passive", label: "Passives", hue: "var(--cat-passive)" },
  { id: "sensor", label: "Sensors", hue: "var(--cat-sensor)" },
  { id: "led-display", label: "LEDs & 7-seg", hue: "var(--cat-led-display)" },
  { id: "display", label: "Displays", hue: "var(--cat-display)" },
  { id: "input", label: "Input", hue: "var(--cat-input)" },
  { id: "output", label: "Output", hue: "var(--cat-output)" },
  { id: "motor", label: "Motors", hue: "var(--cat-motor)" },
  { id: "connector", label: "Connectors", hue: "var(--cat-connector)" },
  { id: "power", label: "Power", hue: "var(--cat-power)" },
];

const PAGE = 12;

function PalGlyph(props: { def: PartDefinition }) {
  const { def } = props;
  const size = partSize(def.type);
  return (
    <svg
      className="pal-glyph"
      viewBox={`-1 -1 ${size.w + 2} ${size.h + 2}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <PartGlyph
        type={def.type}
        transform={{ x: 0, y: 0 }}
        selected={false}
        board={def.category === "board"}
        values={def.defaultProps}
      />
    </svg>
  );
}

export function Palette(props: {
  onPick: (kind: "board" | "component", type: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const q = query.trim().toLowerCase();
  const matches = (d: PartDefinition) =>
    q === "" ||
    d.type.toLowerCase().includes(q) ||
    d.label.toLowerCase().includes(q) ||
    d.category.includes(q);

  const visible = useMemo(() => PART_DEFINITIONS.filter(matches), [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav className="panel palette">
      <div className="pal-search-wrap">
        <input
          value={query}
          placeholder={`search ${PART_DEFINITIONS.length} parts…`}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
            if (e.key === "Enter" && visible[0]) {
              props.onPick(visible[0].category === "board" ? "board" : "component", visible[0].type);
            }
          }}
        />
      </div>
      {CATEGORY_ORDER.map(({ id, label, hue }) => {
        const items = visible.filter((d) => d.category === id);
        if (items.length === 0) return null;
        const open = expanded[id] || q !== "";
        const shown = open ? items : items.slice(0, PAGE);
        return (
          <div key={id}>
            <button
              className="pal-cat"
              onClick={() => setExpanded((x) => ({ ...x, [id]: !x[id] }))}
              title={`toggle ${label}`}
            >
              <span className="dot" style={{ background: hue }} />
              {label}
              <span className="count">{items.length}</span>
            </button>
            <div className="pal-items">
              {shown.map((d) => (
                <button
                  key={d.type}
                  className="palette-item"
                  title={`${d.label} · ${d.pins.length} pins · click to place`}
                  onClick={() => props.onPick(id === "board" ? "board" : "component", d.type)}
                >
                  <PalGlyph def={d} />
                  <span>{d.type}</span>
                </button>
              ))}
            </div>
            {!open && items.length > PAGE && (
              <button
                className="pal-more"
                onClick={() => setExpanded((x) => ({ ...x, [id]: true }))}
              >
                + {items.length - PAGE} more {label.toLowerCase()}…
              </button>
            )}
          </div>
        );
      })}
      {visible.length === 0 && <h3>no match</h3>}
      {q === "" && (
        <>
          <h3>Shapes</h3>
          <div className="pal-items">
            {["box", "cylinder"].map((shape) => (
              <button key={shape} className="palette-item" disabled title="M2: weldable bodies">
                {shape} <span className="badge m2">M2</span>
              </button>
            ))}
          </div>
        </>
      )}
    </nav>
  );
}
