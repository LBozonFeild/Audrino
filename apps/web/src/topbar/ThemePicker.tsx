import { useEffect, useRef, useState } from "react";
import { applyTheme, currentThemeId, THEMES } from "../theme";

/** Popover grid of theme swatches (3 key colors each). */
export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(currentThemeId());
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const pick = (id: string) => {
    applyTheme(id);
    setActive(id);
    setOpen(false);
  };

  const activeTheme = THEMES.find((x) => x.id === active) ?? THEMES[0];

  return (
    <div className="theme-picker" ref={box}>
      <button className="theme-btn" onClick={() => setOpen(!open)} title="Theme">
        <span className="theme-dots">
          <i style={{ background: activeTheme.vars.accent }} />
          <i style={{ background: activeTheme.vars.accent2 }} />
          <i style={{ background: activeTheme.vars.ok }} />
        </span>
        {activeTheme.name}
        <span className="chev">▾</span>
      </button>
      {open && (
        <div className="theme-pop">
          <div className="theme-pop-head">{THEMES.length} themes</div>
          <div className="theme-grid">
            {THEMES.map((x) => (
              <button
                key={x.id}
                className={`theme-cell${x.id === active ? " on" : ""}`}
                onClick={() => pick(x.id)}
              >
                <span className="theme-dots">
                  <i style={{ background: x.vars.accent }} />
                  <i style={{ background: x.vars.accent2 }} />
                  <i style={{ background: x.vars.ok }} />
                </span>
                {x.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
