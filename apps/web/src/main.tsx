import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyTheme, currentThemeId } from "./theme";
import "./styles.css";

applyTheme(currentThemeId());

createRoot(document.getElementById("root")!).render(<App />);
