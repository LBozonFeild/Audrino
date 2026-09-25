/** Theme engine — flat CSS variable packs, applied to :root at runtime. */

export interface Theme {
  id: string;
  name: string;
  vars: {
    bg: string;
    canvas: string;
    gridDot: string;
    panel: string;
    panel2: string;
    border: string;
    fg: string;
    dim: string;
    accent: string;
    accent2: string;
    accentInk: string;
    ok: string;
    danger: string;
    input: string;
    hover: string;
    shadow: string;
    wire: string;
  };
}

const t = (
  id: string,
  name: string,
  v: Theme["vars"],
): Theme => ({ id, name, vars: v });

const mk = (
  bg: string, canvas: string, gridDot: string, panel: string, panel2: string,
  border: string, fg: string, dim: string, accent: string, accent2: string,
  accentInk = "#ffffff", ok = "#2ea44f", danger = "#d64550",
  input?: string, hover?: string, shadow = "0 8px 24px rgba(0,0,0,.12)", wire = "#37474f",
): Theme["vars"] => ({
  bg, canvas, gridDot, panel, panel2, border, fg, dim, accent, accent2, accentInk, ok, danger,
  input: input ?? panel2,
  hover: hover ?? panel2,
  shadow, wire,
});

export const THEMES: Theme[] = [
  t("tinkercad", "Tinkercad Light", mk(
    "#e9edf2", "#f7f9fb", "#c3ccd8", "#ffffff", "#f1f4f8", "#dde3ea",
    "#23303f", "#6b7c93", "#007bb0", "#f5a623", "#ffffff", "#23a954", "#e8593c",
    "#f4f7fa", "#e8f6fc", "0 10px 30px rgba(30,50,80,.14)", "#37474f")),
  t("tinkercad-dark", "Tinkercad Dark", mk(
    "#151a21", "#1a2029", "#2c3644", "#202833", "#28323f", "#364354",
    "#dce4ee", "#8fa0b5", "#00b4ff", "#ffb347", "#06202c", "#33c27a", "#ff6b5e",
    "#1a2029", "#2a3442", "0 10px 30px rgba(0,0,0,.45)", "#90a4ae")),
  t("blueprint", "Blueprint", mk(
    "#0d2c54", "#0f3466", "#3a67a8", "#12376b", "#16417e", "#3a67a8",
    "#dcecff", "#8fb3e0", "#7fd4ff", "#ffd166", "#052033", "#4fd69c", "#ff7b72",
    "#0c2c54", "#16417e", "0 10px 30px rgba(0,0,0,.35)", "#7fd4ff")),
  t("graph-paper", "Graph Paper", mk(
    "#f6f8f5", "#fbfdfa", "#cfe3d2", "#ffffff", "#eef5ee", "#d5e4d7",
    "#243328", "#68806e", "#2b8454", "#e0a23a", "#ffffff", "#2f8f5b", "#d64550",
    "#eef5ee", "#e5f2e8", "0 8px 22px rgba(40,70,50,.12)", "#37474f")),
  t("sketch", "Sketchbook", mk(
    "#f4efe6", "#faf6ee", "#d9d1c2", "#fffdf8", "#efe9dc", "#ddd4c3",
    "#33302a", "#8a8272", "#c94d34", "#3a7bd5", "#ffffff", "#2ea44f", "#d64550",
    "#efe9dc", "#ebe3d4", "0 8px 22px rgba(80,60,30,.14)", "#5d574c")),
  t("sepia", "Sepia Print", mk(
    "#efe2c8", "#f6ecd8", "#d4c2a0", "#f9f1de", "#ecdfc4", "#d9c9a8",
    "#4a3b26", "#8d7a5c", "#a05a2c", "#6b8f3a", "#fff8ea", "#6b8f3a", "#b23c2a",
    "#ecdfc4", "#e8d9ba", "0 8px 22px rgba(90,60,20,.16)", "#6d5a40")),
  t("nord-light", "Nord Light", mk(
    "#e9eef4", "#f2f5f9", "#c5d0de", "#ffffff", "#e6ebf2", "#d2dbe6",
    "#2e3440", "#6b7788", "#57779f", "#a3566a", "#ffffff", "#2f7d4f", "#bf616a",
    "#e6ebf2", "#dde6f0", "0 8px 22px rgba(40,60,90,.12)", "#434c5e")),
  t("monokai", "Monokai", mk(
    "#20211c", "#272822", "#3e3d32", "#2d2e27", "#383931", "#494a3e",
    "#f8f8f2", "#92927f", "#f92672", "#a6e22e", "#1a1b16", "#a6e22e", "#fd5ff1",
    "#272822", "#383931", "0 10px 30px rgba(0,0,0,.45)", "#f8f8f2")),
  t("monokai-pro", "Monokai Pro", mk(
    "#1c1b1e", "#221f26", "#33313a", "#292730", "#34323d", "#45434f",
    "#fcfcfa", "#928d9c", "#ff6188", "#ffd866", "#151318", "#a9dc76", "#ab9df2",
    "#221f26", "#34323d", "0 10px 30px rgba(0,0,0,.5)", "#fcfcfa")),
  t("gruvbox-dark", "Gruvbox Dark", mk(
    "#242220", "#2c2825", "#3d3731", "#322c28", "#3b342e", "#4d443b",
    "#ebdbb2", "#a89984", "#d79921", "#83a598", "#282828", "#98971a", "#fb4934",
    "#2c2825", "#3b342e", "0 10px 28px rgba(0,0,0,.42)", "#ebdbb2")),
  t("gruvbox-light", "Gruvbox Light", mk(
    "#f4edd6", "#fbf3db", "#dccbaa", "#fbf3db", "#efe2c2", "#d5c29d",
    "#3c3836", "#928377", "#af3a03", "#458588", "#fbf3db", "#79740e", "#cc241d",
    "#efe2c2", "#ebdbb2", "0 8px 22px rgba(80,60,20,.15)", "#504945")),
  t("solarized-dark", "Solarized Dark", mk(
    "#002b36", "#063440", "#17505f", "#073642", "#0a4050", "#1a5a6b",
    "#eee8d5", "#839496", "#2074af", "#b58900", "#fdf6e3", "#859900", "#dc322f",
    "#073642", "#0a4050", "0 10px 28px rgba(0,0,0,.4)", "#93a1a1")),
  t("catppuccin-mocha", "Catppuccin Mocha", mk(
    "#181825", "#1e1e2e", "#313244", "#1e1e2e", "#252536", "#3b3b52",
    "#cdd6f4", "#7f849c", "#cba6f7", "#89b4fa", "#11111b", "#a6e3a1", "#f38ba8",
    "#181825", "#2a2a3c", "0 10px 30px rgba(0,0,0,.5)", "#cdd6f4")),
  t("catppuccin-macchiato", "Catppuccin Macchiato", mk(
    "#181926", "#1e2030", "#303446", "#1e2030", "#24273a", "#3b3e55",
    "#cad3f5", "#8087a2", "#c6a0f6", "#8aadf4", "#11121c", "#a6da95", "#ed8796",
    "#181926", "#2a2c3e", "0 10px 30px rgba(0,0,0,.5)", "#cad3f5")),
  t("catppuccin-frappe", "Catppuccin Frappé", mk(
    "#232634", "#292c3c", "#3b3f54", "#292c3c", "#303446", "#454963",
    "#c6d0f5", "#838ba7", "#ca9ee6", "#8caaee", "#1a1c26", "#a6d189", "#e78284",
    "#232634", "#33374a", "0 10px 30px rgba(0,0,0,.45)", "#c6d0f5")),
  t("catppuccin-latte", "Catppuccin Latte", mk(
    "#eff1f5", "#e6e9ef", "#c7c9d4", "#e6e9ef", "#dce0e8", "#cfd2dc",
    "#4c4f69", "#7c7f93", "#8839ef", "#1e66f5", "#ffffff", "#40a02b", "#d20f39",
    "#dce0e8", "#e6e9ef", "0 8px 22px rgba(60,60,90,.13)", "#5c5f77")),
  t("github-light", "GitHub Light", mk(
    "#f6f8fa", "#ffffff", "#d0d7de", "#ffffff", "#f6f8fa", "#d0d7de",
    "#1f2328", "#656d76", "#0969da", "#bf8700", "#ffffff", "#1a7f37", "#cf222e",
    "#f6f8fa", "#eef1f4", "0 8px 22px rgba(30,40,60,.12)", "#1f2328")),
  t("github-dark", "GitHub Dark", mk(
    "#0d1117", "#10151c", "#262c36", "#10151c", "#151b23", "#2a313c",
    "#e6edf3", "#8b949e", "#4493f8", "#d29922", "#0d1117", "#3fb950", "#f85149",
    "#0d1117", "#151b23", "0 10px 28px rgba(0,0,0,.5)", "#e6edf3")),
  t("github-dimmed", "GitHub Dimmed", mk(
    "#151a21", "#1b2027", "#2c333d", "#1b2027", "#202630", "#333b47",
    "#c6c9cd", "#7a828e", "#539bf5", "#e0a458", "#101418", "#57ab5a", "#e5534b",
    "#151a21", "#202630", "0 10px 28px rgba(0,0,0,.45)", "#c6c9cd")),
  t("tokyo-night", "Tokyo Night", mk(
    "#16161e", "#1a1b26", "#2b2d3f", "#1a1b26", "#20212e", "#33354a",
    "#c0caf5", "#787c99", "#bb9af7", "#7aa2f7", "#101014", "#9ece6a", "#f7768e",
    "#16161e", "#20212e", "0 10px 30px rgba(0,0,0,.5)", "#c0caf5")),
  t("tokyo-storm", "Tokyo Storm", mk(
    "#1b1d2b", "#202231", "#2f3346", "#202231", "#25273a", "#383c54",
    "#c8d3f5", "#828bb0", "#c099ff", "#82aaff", "#15161f", "#7ad88b", "#ff757f",
    "#1b1d2b", "#25273a", "0 10px 30px rgba(0,0,0,.45)", "#c8d3f5")),
  t("one-dark", "One Dark", mk(
    "#21252b", "#282c34", "#3a3f4b", "#282c34", "#2f343f", "#404652",
    "#abb2bf", "#7f8797", "#61afef", "#e5c07b", "#181a1f", "#98c379", "#e06c75",
    "#23272e", "#2f343f", "0 10px 28px rgba(0,0,0,.42)", "#abb2bf")),
  t("ayu-light", "Ayu Light", mk(
    "#f8f9fa", "#fafbfc", "#d9dee4", "#ffffff", "#f0f2f4", "#dde2e8",
    "#5c6773", "#8a929e", "#297ca5", "#ff9940", "#ffffff", "#6cbf43", "#f07171",
    "#f0f2f4", "#e9eef2", "0 8px 22px rgba(50,70,90,.12)", "#5c6773")),
  t("ayu-mirage", "Ayu Mirage", mk(
    "#1f2430", "#232834", "#343b4c", "#232834", "#282e3c", "#3b4356",
    "#cbccc6", "#707a8c", "#5ccfe6", "#ffcc66", "#171a22", "#bae67e", "#f28779",
    "#1f2430", "#282e3c", "0 10px 30px rgba(0,0,0,.45)", "#cbccc6")),
  t("ayu-dark", "Ayu Dark", mk(
    "#0a0e14", "#0d1219", "#1c2430", "#0d1219", "#111821", "#222c3a",
    "#bfbdb6", "#6c7380", "#39bae6", "#ffb454", "#070a0e", "#7fd962", "#f07178",
    "#0a0e14", "#111821", "0 10px 30px rgba(0,0,0,.55)", "#bfbdb6")),
  t("synthwave", "Synthwave '84", mk(
    "#181329", "#1e1836", "#372b5c", "#1e1836", "#251d45", "#3d2f68",
    "#f4f1ff", "#9d8dc0", "#ff7edb", "#36f9f6", "#120d1d", "#72f1b8", "#fe4450",
    "#181329", "#251d45", "0 10px 30px rgba(20,10,40,.5)", "#f4f1ff")),
  t("cyber-neon", "Cyber Neon", mk(
    "#070b14", "#0a101c", "#142033", "#0a101c", "#0e1625", "#1b2a41",
    "#d7f6ff", "#5d7d99", "#00f0ff", "#ff2ea6", "#02060c", "#39ff88", "#ff3860",
    "#070b14", "#0e1625", "0 0 18px rgba(0,240,255,.25)", "#00f0ff")),
  t("matrix", "Matrix", mk(
    "#010501", "#020802", "#0c2a14", "#020802", "#05140a", "#0d3318",
    "#39ff6a", "#1f7a3d", "#39ff6a", "#b5ffcd", "#001005", "#39ff6a", "#00d957",
    "#010501", "#05140a", "0 0 16px rgba(57,255,106,.2)", "#39ff6a")),
  t("amber-terminal", "Amber Terminal", mk(
    "#120d02", "#171002", "#2c2005", "#171002", "#1c1403", "#332507",
    "#ffb000", "#a06d00", "#ffb000", "#ffe28a", "#0d0800", "#d08a00", "#ff6a00",
    "#120d02", "#1c1403", "0 10px 28px rgba(0,0,0,.5)", "#ffb000")),
  t("pastel-candy", "Pastel Candy", mk(
    "#fdeef4", "#fff6fa", "#f0cddc", "#ffffff", "#fde8f0", "#f2d3e0",
    "#5a4453", "#a58c9e", "#b65180", "#7ec8e3", "#ffffff", "#6fcf97", "#eb5757",
    "#fde8f0", "#fce4ef", "0 8px 24px rgba(230,120,180,.18)", "#7a5c6e")),
  t("cupcake", "Cupcake", mk(
    "#fdf2f5", "#fff7fa", "#e9c9d8", "#ffffff", "#fbeaf1", "#edd3de",
    "#6b4e5c", "#a88798", "#ac598e", "#83c5be", "#ffffff", "#7fb77e", "#ef7c8e",
    "#fbeaf1", "#f8e3ec", "0 8px 22px rgba(210,120,170,.16)", "#8a6b7a")),
  t("coffee", "Coffee", mk(
    "#2b211a", "#332820", "#4a3b2e", "#332820", "#3b2e24", "#544332",
    "#eaddcc", "#a68f7a", "#c8956c", "#9dcead", "#1f1712", "#a3b18a", "#d17b68",
    "#2b211a", "#3b2e24", "0 10px 28px rgba(0,0,0,.42)", "#eaddcc")),
  t("forest", "Forest Cabin", mk(
    "#1a2620", "#1f2e26", "#31453a", "#1f2e26", "#263830", "#3a5245",
    "#dcebdd", "#8fa89a", "#6fbf8f", "#d2b869", "#121b16", "#6fbf8f", "#d96c6c",
    "#1a2620", "#263830", "0 10px 28px rgba(0,0,0,.4)", "#dcebdd")),
  t("ocean", "Ocean Breeze", mk(
    "#e7f1f7", "#f2f8fc", "#c4d8e6", "#ffffff", "#e9f2f8", "#d3e2ee",
    "#1c3b52", "#5f8299", "#177ea2", "#5ec4b6", "#ffffff", "#2ea56c", "#e06a5f",
    "#e9f2f8", "#dfeef7", "0 8px 24px rgba(20,80,120,.14)", "#2c4f68")),
  t("sunset", "Sunset Dusk", mk(
    "#2a1f33", "#332640", "#4c3a62", "#332640", "#3c2f4d", "#56426e",
    "#f4e8f0", "#a58fab", "#ff8c69", "#ffd166", "#241a2c", "#7bd389", "#ff5f6d",
    "#2a1f33", "#3c2f4d", "0 10px 30px rgba(0,0,0,.42)", "#f4e8f0")),
  t("lavender", "Lavender Haze", mk(
    "#f2eefb", "#f8f5ff", "#d5cbea", "#ffffff", "#ede7f8", "#ddd4ee",
    "#4a3f63", "#8b7fa8", "#7f67b2", "#f29d49", "#ffffff", "#5faf7f", "#d96363",
    "#ede7f8", "#e8e0f5", "0 8px 24px rgba(140,110,210,.16)", "#5f5278")),
  t("high-contrast", "High Contrast", mk(
    "#ffffff", "#ffffff", "#000000", "#ffffff", "#f0f0f0", "#000000",
    "#000000", "#333333", "#0033cc", "#cc6600", "#ffffff", "#006600", "#990000",
    "#f5f5f5", "#e8e8e8", "none", "#000000")),
  t("high-contrast-dark", "HC Dark", mk(
    "#000000", "#000000", "#ffffff", "#000000", "#0d0d0d", "#ffffff",
    "#ffffff", "#cccccc", "#4db8ff", "#ffd24d", "#000000", "#5cf28a", "#ff5c5c",
    "#000000", "#101010", "none", "#ffffff")),
  t("wireframe", "Wireframe", mk(
    "#efefef", "#fafafa", "#bdbdbd", "#ffffff", "#f2f2f2", "#9a9a9a",
    "#1a1a1a", "#666666", "#333333", "#8a8a8a", "#ffffff", "#2e7d32", "#c62828",
    "#f5f5f5", "#ececec", "0 2px 8px rgba(0,0,0,.12)", "#4a4a4a")),
  t("minecraft", "Crafting Table", mk(
    "#8b8b8b", "#a0a0a0", "#6f6f6f", "#c6c6c6", "#b0b0b0", "#565656",
    "#242424", "#5c5c5c", "#008383", "#d8a000", "#ffffff", "#3b9c2e", "#b3332e",
    "#b0b0b0", "#bdbdbd", "0 6px 0 rgba(0,0,0,.25)", "#3f3f3f")),
  t("sand", "Desert Sand", mk(
    "#f3e7d3", "#f8efdd", "#d9c5a0", "#fdf6e9", "#efe2c8", "#dcc9a5",
    "#5a4632", "#9b8668", "#9c6638", "#4f9d8d", "#fffaf0", "#6a9f4e", "#c4503c",
    "#efe2c8", "#eadbc0", "0 8px 22px rgba(120,90,40,.16)", "#6d5943")),
  t("dracula", "Dracula", mk(
    "#282a36", "#21222c", "#44475a", "#343746", "#424455", "#44475a",
    "#f8f8f2", "#b9c0d0", "#bd93f9", "#ffb86c", "#1a1026", "#50fa7b", "#ff5555",
    "#424455", "#424455", "0 10px 30px rgba(0,0,0,.4)", "#8be9fd")),
  t("nord", "Nord", mk(
    "#2e3440", "#3b4252", "#4c566a", "#3b4252", "#434c5e", "#4c566a",
    "#eceff4", "#c3cad6", "#88c0d0", "#ebcb8b", "#1c2733", "#a3be8c", "#bf616a",
    "#434c5e", "#434c5e", "0 10px 30px rgba(0,0,0,.4)", "#d8dee9")),
  t("solarized-light", "Solarized Light", mk(
    "#fdf6e3", "#eee8d5", "#d3cbb7", "#fdf6e3", "#eee8d5", "#d3cbb7",
    "#073642", "#5f7076", "#b3341a", "#b58900", "#ffffff", "#5c7a00", "#c0221f",
    "#eee8d5", "#eee8d5", "0 10px 30px rgba(0,0,0,.14)", "#657b83")),
  t("amoled", "AMOLED Black", mk(
    "#000000", "#060606", "#222222", "#0d0d0d", "#181818", "#282828",
    "#fafafa", "#a8a8b0", "#22d3ee", "#f472b6", "#062a30", "#34d399", "#f87171",
    "#181818", "#181818", "0 10px 30px rgba(0,0,0,.4)", "#e5e5e5")),
  t("rose-pine", "Rosé Pine", mk(
    "#191724", "#1f1d2e", "#2a273a", "#262336", "#2a273a", "#393552",
    "#e0def4", "#908caa", "#c4a7e7", "#f6c177", "#1e1430", "#9ccfd8", "#eb6f92",
    "#2a273a", "#2a273a", "0 10px 30px rgba(0,0,0,.4)", "#a59bc4")),
  t("kanagawa", "Kanagawa", mk(
    "#1f1f28", "#16161d", "#363646", "#2a2a37", "#363646", "#54546d",
    "#dcd7ba", "#a8a296", "#7e9cd8", "#ffa066", "#10131c", "#98bb6c", "#e46876",
    "#363646", "#363646", "0 10px 30px rgba(0,0,0,.4)", "#c0a583")),
  t("everforest", "Everforest", mk(
    "#2d353b", "#272e33", "#3d484d", "#343f44", "#3d484d", "#475258",
    "#d3c6aa", "#9da9a0", "#a7c080", "#e69875", "#1e2420", "#83c092", "#e67e80",
    "#3d484d", "#3d484d", "0 10px 30px rgba(0,0,0,.4)", "#d3c6aa")),
];

const VAR_MAP: Record<keyof Theme["vars"], string> = {
  bg: "--bench-bg",
  canvas: "--bench-canvas",
  gridDot: "--bench-bg-grid",
  panel: "--bench-panel",
  panel2: "--bench-panel-2",
  border: "--bench-border",
  fg: "--bench-fg",
  dim: "--bench-fg-dim",
  accent: "--bench-accent",
  accent2: "--bench-accent-2",
  accentInk: "--bench-accent-ink",
  ok: "--bench-ok",
  danger: "--bench-danger",
  input: "--bench-input",
  hover: "--bench-hover",
  shadow: "--bench-shadow",
  wire: "--bench-wire",
};

const KEY = "audrino.theme";

export function applyTheme(id: string): void {
  const theme = THEMES.find((x) => x.id === id) ?? THEMES[0];
  const root = document.documentElement;
  (Object.keys(VAR_MAP) as (keyof Theme["vars"])[]).forEach((k) => {
    root.style.setProperty(VAR_MAP[k], theme.vars[k]);
  });
  root.dataset.theme = theme.id;
  window.dispatchEvent(new Event("audrino-theme"));
  try {
    localStorage.setItem(KEY, theme.id);
  } catch {
    /* private mode */
  }
}

export function currentThemeId(): string {
  try {
    return localStorage.getItem(KEY) ?? "tinkercad";
  } catch {
    return "tinkercad";
  }
}
