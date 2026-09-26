import { createRoot } from "react-dom/client";
import { Root } from "./Root";
import { applyTheme, currentThemeId } from "./theme";
import "./styles.css";

applyTheme(currentThemeId());

createRoot(document.getElementById("root")!).render(<Root />);
