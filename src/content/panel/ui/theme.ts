type FontConfig = {
  css: string;
  url?: string;
};

const FONT_CONFIGS: Record<string, FontConfig> = {
  inter: {
    css: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    url: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  },
  notosansjp: {
    css: '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    url: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap",
  },
  outfit: {
    css: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    url: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap",
  },
  serif: {
    css: 'Georgia, Cambria, "Times New Roman", "Noto Serif JP", serif',
    url: "https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap",
  },
  system: {
    css: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};

export function isColorDark(hex: string): boolean {
  const color = hex.replace("#", "");
  if (color.length !== 6) return false;

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  return yiq < 128;
}

export function applyFontFamily(fontKey: string, appRoot: HTMLElement): void {
  document.getElementById("mv-dynamic-font")?.remove();

  const config = FONT_CONFIGS[fontKey] ?? FONT_CONFIGS.system;
  if (config.url) {
    const link = document.createElement("link");
    link.id = "mv-dynamic-font";
    link.rel = "stylesheet";
    link.href = config.url;
    document.head.appendChild(link);
  }

  appRoot.style.setProperty("--mv-font-family", config.css);
}
