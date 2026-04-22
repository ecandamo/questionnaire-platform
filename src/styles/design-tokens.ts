/**
 * ⚠️  REFERENCE ONLY — does not drive the UI.
 * Live tokens: `src/app/globals.css` (`:root`, `.dark`, `@theme inline`).
 * Brand SVG paths: `src/lib/brand-assets.ts` → `/public/brand/`
 *
 * Last synced with globals.css for light theme hex + semantic status + shadows.
 */

/**
 * Snapshot of `:root` semantic colors from globals.css (light theme).
 * oklch() values are quoted as-is where used in CSS.
 */
export const liveThemeLight = {
  background: "#f7f8fb",
  foreground: "#11151e",
  card: "#ffffff",
  cardForeground: "#11151e",
  primary: "oklch(0.3 0.1 264)" as const,
  primaryForeground: "#ffffff",
  secondary: "oklch(0.57 0.13 132)" as const,
  secondaryForeground: "#ffffff",
  muted: "#eef0f5",
  mutedForeground: "#3f4754",
  accent: "oklch(0.7 0.17 132)" as const,
  accentForeground: "#0b1428",
  destructive: "oklch(0.52 0.19 25)" as const,
  destructiveForeground: "#ffffff",
  border: "#e4e7ee",
  input: "#e4e7ee",
  ring: "color-mix(in oklab, #273b6e 45%, transparent)",
  radiusBase: "0.625rem",
  sidebar: "#0b1428",
  sidebarForeground: "oklch(0.93 0.006 255)" as const,
  sidebarPrimary: "#78bc43",
  sidebarPrimaryForeground: "#0b1428",
  sidebarAccent: "#18264b",
  sidebarBorder: "#121d3a",
  success: "#2e8f3e",
  successForeground: "#ffffff",
  successMuted: "#e9f6ec",
  warning: "#c47a0b",
  warningForeground: "#ffffff",
  warningMuted: "#fdf3e0",
  info: "#273b6e",
  infoForeground: "#ffffff",
  infoMuted: "#eef1f8",
  destructiveMuted: "#fbeceb",
  shadowCard:
    "0 1px 2px 0 rgb(39 59 110 / 0.06), 0 1px 3px 0 rgb(39 59 110 / 0.05)",
  shadowCardHover:
    "0 4px 10px -2px rgb(39 59 110 / 0.1), 0 2px 4px -2px rgb(39 59 110 / 0.06)",
} as const

export const designTokens = {
  /** Use `liveThemeLight` for values that map 1:1 to `globals.css` :root */
  liveLight: liveThemeLight,

  colors: {
    primary: {
      50: "#EEF1F8",
      100: "#D9DFEE",
      200: "#B3BFDC",
      300: "#8592BE",
      400: "#556C9E",
      500: "#273B6E",
      600: "#1F3160",
      700: "#18264B",
      800: "#121D3A",
      900: "#0B1428",
      DEFAULT: "#273B6E",
      foreground: "#FFFFFF",
    },

    secondary: {
      50: "#F2FAEA",
      100: "#DCF1C4",
      200: "#BAE391",
      300: "#9CD668",
      400: "#8AC852",
      500: "#78BC43",
      600: "#61A331",
      700: "#4A8524",
      800: "#35641A",
      900: "#244611",
      DEFAULT: "#78BC43",
      foreground: "#FFFFFF",
    },

    accent: {
      DEFAULT: "#78BC43",
      foreground: "#0B1428",
    },

    neutral: {
      50: "#F7F8FB",
      100: "#EEF0F5",
      200: "#D4D9E1",
      300: "#B6BECB",
      400: "#8C95A6",
      500: "#7F7F7F",
      600: "#5B6472",
      700: "#3F4754",
      800: "#262D39",
      900: "#11151E",
    },

    semantic: {
      success: {
        light: "#E9F6EC",
        DEFAULT: "#2E8F3E",
        foreground: "#FFFFFF",
      },
      warning: {
        light: "#FDF3E0",
        DEFAULT: "#C47A0B",
        foreground: "#FFFFFF",
      },
      error: {
        light: "#FBECEB",
        DEFAULT: "#C6342C",
        foreground: "#FFFFFF",
      },
      info: {
        light: "#EEF1F8",
        DEFAULT: "#273B6E",
        foreground: "#FFFFFF",
      },
    },

    chart: {
      1: "oklch(0.3 0.1 264)",
      2: "oklch(0.7 0.17 132)",
      3: "#7F7F7F",
      4: "oklch(0.44 0.14 290)",
      5: "oklch(0.57 0.13 132)",
    },
  },

  fonts: {
    heading: {
      family: "'Mulish', ui-sans-serif, system-ui, sans-serif",
      weights: { medium: 500, semibold: 600, bold: 700, extrabold: 800 },
      letterSpacing: "-0.025em",
    },
    body: {
      family: "'Mulish', ui-sans-serif, system-ui, sans-serif",
      weights: { regular: 400, medium: 500, semibold: 600 },
      letterSpacing: "0em",
    },
    mono: {
      family: "'JetBrains Mono', ui-monospace, monospace",
      weights: { regular: 400, medium: 500 },
      letterSpacing: "0em",
    },
  },

  typography: {
    xs: { size: "0.75rem", lineHeight: "1rem" },
    sm: { size: "0.875rem", lineHeight: "1.25rem" },
    base: { size: "1rem", lineHeight: "1.5rem" },
    lg: { size: "1.125rem", lineHeight: "1.75rem" },
    xl: { size: "1.25rem", lineHeight: "1.75rem" },
    "2xl": { size: "1.5rem", lineHeight: "2rem" },
    "3xl": { size: "1.875rem", lineHeight: "2.25rem" },
    "4xl": { size: "2.25rem", lineHeight: "2.5rem" },
    "5xl": { size: "3rem", lineHeight: "1" },
    kpi: { size: "3rem", lineHeight: "1", letterSpacing: "-0.025em" },
  },

  spacing: {
    px: "1px",
    0: "0",
    0.5: "0.125rem",
    1: "0.25rem",
    1.5: "0.375rem",
    2: "0.5rem",
    2.5: "0.625rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    7: "1.75rem",
    8: "2rem",
    9: "2.25rem",
    10: "2.5rem",
    12: "3rem",
    14: "3.5rem",
    16: "4rem",
    20: "5rem",
    24: "6rem",
    32: "8rem",
  },

  borderRadius: {
    none: "0",
    sm: "calc(var(--radius) * 0.6)",
    md: "calc(var(--radius) * 0.8)",
    lg: "var(--radius)",
    xl: "calc(var(--radius) * 1.4)",
    "2xl": "calc(var(--radius) * 1.8)",
    full: "9999px",
    /** Base `--radius` in globals */
    baseVariable: "0.625rem",
  },

  shadows: {
    card: liveThemeLight.shadowCard,
    cardHover: liveThemeLight.shadowCardHover,
    none: "none",
  },

  transitions: {
    fast: "120ms cubic-bezier(0.2, 0.8, 0.2, 1)",
    base: "180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
    slow: "280ms cubic-bezier(0.5, 0, 0.2, 1)",
  },

  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },

  layout: {
    /** Dashboard sidebar rail — matches Ops Hub kit */
    sidebarWidthPx: 232,
    /** Header bar — design system */
    headerHeightPx: 64,
    /** Main content max width — Tailwind max-w-7xl */
    contentMaxPx: 1280,
  },

  zIndex: {
    hide: -1,
    base: 0,
    dropdown: 10,
    sticky: 20,
    overlay: 30,
    modal: 40,
    popover: 50,
    toast: 100,
    tooltip: 1000,
  },
} as const

export type DesignTokens = typeof designTokens
