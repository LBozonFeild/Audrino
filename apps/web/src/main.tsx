import { createRoot } from "react-dom/client";
import { Root } from "./Root";
import { applyTheme, currentThemeId } from "./theme";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "@fontsource/nunito/900.css";
import "./styles.css";

applyTheme(currentThemeId());

createRoot(document.getElementById("root")!).render(<Root />);
