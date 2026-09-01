export function hexToRGB(hex: string): string {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

export function lighten(hex: string, amount: number): string {
    const h = hex.replace("#", "");
    const r = Math.round(parseInt(h.substring(0, 2), 16) + (255 - parseInt(h.substring(0, 2), 16)) * amount);
    const g = Math.round(parseInt(h.substring(2, 4), 16) + (255 - parseInt(h.substring(2, 4), 16)) * amount);
    const b = Math.round(parseInt(h.substring(4, 6), 16) + (255 - parseInt(h.substring(4, 6), 16)) * amount);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function darken(hex: string, amount: number): string {
    const h = hex.replace("#", "");
    const r = Math.round(parseInt(h.substring(0, 2), 16) * (1 - amount));
    const g = Math.round(parseInt(h.substring(2, 4), 16) * (1 - amount));
    const b = Math.round(parseInt(h.substring(4, 6), 16) * (1 - amount));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function generateThemeCssVariables(primary: string, accent: string): string {
    const accentRGB = hexToRGB(accent);
    const primaryRGB = hexToRGB(primary);

    return `
      :root {
        --primary-color: ${primary};
        --accent-color: ${accent};
        --accent-dark: ${darken(accent, 0.2)};
        --accent-light: ${lighten(accent, 0.3)};
        --accent-subtle: rgba(${accentRGB}, 0.06);
        --accent-glow: rgba(${accentRGB}, 0.14);
        --hero-gradient-from: ${darken(primary, 0.1)};
        --hero-gradient-to: ${lighten(primary, 0.08)};
        --badge-bg: rgba(${accentRGB}, 0.08);
        --badge-text: ${accent};
        --glass-border: rgba(${primaryRGB}, 0.08);
        --premium-shadow: 0 25px 60px -12px rgba(${primaryRGB}, 0.18), 0 0 40px -10px rgba(${accentRGB}, 0.08);
        --shadow-glow: 0 0 40px -10px rgba(${accentRGB}, 0.5);
      }
    `;
}
