/**
 * ⚠️  REFERENCE ONLY — This file documents the design system
 * but does NOT drive the UI directly.
 *
 * The live design system lives in src/app/globals.css
 * All Tailwind utilities pull from CSS variables defined there.
 *
 * When updating the design system, edit globals.css directly.
 * Keep this file in sync manually as a human-readable reference.
 *
 * Design Tokens — API Brand
 *
 * Primary: API Navy #273B6E — authority, trust, depth
 * Accent:  API Green #78BC43 — action, success, highlight
 * Neutral: API Gray #7F7F7F + Light Blue-Gray #D4D9E1
 *
 * Typography: IBM Plex Sans (headings) + Source Sans 3 (body)
 * Style: Dark navy sidebar, clean white content surfaces
 */

export const designTokens = {
  colors: {
    primary: {
      50: '#EEF1F9',
      100: '#D5DAF0',
      200: '#ABB5E1',
      300: '#7B8FCE',
      400: '#5068BA',
      500: '#3A52A0',
      600: '#2E4285',
      700: '#273B6E',  // API Navy
      800: '#1E2E57',
      900: '#152040',
      950: '#0B1225',
      DEFAULT: '#273B6E',
      foreground: '#FFFFFF',
    },

    secondary: {
      50: '#F2FAE8',
      100: '#DCF2C4',
      200: '#BAE58A',
      300: '#96D458',
      400: '#78BC43',  // API Green
      500: '#62A334',
      600: '#4E8829',
      700: '#3B6D1F',
      800: '#2A5116',
      900: '#1B380D',
      950: '#0D1F06',
      DEFAULT: '#78BC43',
      foreground: '#FFFFFF',
    },

    accent: {
      50: '#F2FAE8',
      100: '#DCF2C4',
      200: '#BAE58A',
      300: '#96D458',
      400: '#78BC43',  // API Green — same as secondary, used as accent
      500: '#62A334',
      600: '#4E8829',
      700: '#3B6D1F',
      800: '#2A5116',
      900: '#1B380D',
      950: '#0D1F06',
      DEFAULT: '#78BC43',
      foreground: '#1c2e57',  // dark navy on green
    },

    neutral: {
      50: '#F7F8FA',
      100: '#EEF0F4',
      200: '#D4D9E1',  // API Light Blue-Gray
      300: '#B4BCC9',
      400: '#8E98A8',
      500: '#7F7F7F',  // API Gray
      600: '#5E6472',
      700: '#434959',
      800: '#2C3142',
      900: '#1A1F2E',
      950: '#0D1018',
    },

    semantic: {
      success: {
        light: '#DCF2C4',
        DEFAULT: '#4E8829',
        dark: '#3B6D1F',
        foreground: '#FFFFFF',
      },
      warning: {
        light: '#FEF3C7',
        DEFAULT: '#D97706',
        dark: '#92400E',
        foreground: '#FFFFFF',
      },
      error: {
        light: '#FEE2E2',
        DEFAULT: '#DC2626',
        dark: '#991B1B',
        foreground: '#FFFFFF',
      },
      info: {
        light: '#EEF1F9',
        DEFAULT: '#273B6E',
        dark: '#1E2E57',
        foreground: '#FFFFFF',
      },
    },

    chart: {
      1: '#273B6E',  // API Navy
      2: '#78BC43',  // API Green
      3: '#7F7F7F',  // API Gray
      4: '#5068BA',  // Navy mid
      5: '#4E8829',  // Dark green
    },
  },

  fonts: {
    heading: {
      family: "'IBM Plex Sans', sans-serif",
      weights: { medium: 500, semibold: 600, bold: 700 },
      letterSpacing: '-0.025em',
    },
    body: {
      family: "'Source Sans 3', sans-serif",
      weights: { regular: 400, medium: 500, semibold: 600 },
      letterSpacing: '0em',
    },
    mono: {
      family: "'JetBrains Mono', monospace",
      weights: { regular: 400, medium: 500 },
      letterSpacing: '0em',
    },
  },

  typography: {
    xs: { size: '0.75rem', lineHeight: '1rem' },
    sm: { size: '0.875rem', lineHeight: '1.25rem' },
    base: { size: '1rem', lineHeight: '1.5rem' },
    lg: { size: '1.125rem', lineHeight: '1.75rem' },
    xl: { size: '1.25rem', lineHeight: '1.75rem' },
    '2xl': { size: '1.5rem', lineHeight: '2rem' },
    '3xl': { size: '1.875rem', lineHeight: '2.25rem' },
    '4xl': { size: '2.25rem', lineHeight: '2.5rem' },
    '5xl': { size: '3rem', lineHeight: '1' },
    kpi: { size: '3rem', lineHeight: '1', letterSpacing: '-0.025em' },
  },

  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
  },

  borderRadius: {
    none: '0',
    sm: '0.25rem',
    DEFAULT: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    card: '0 1px 3px 0 rgb(39 59 110 / 0.05), 0 1px 2px -1px rgb(39 59 110 / 0.04)',
    cardHover:
      '0 4px 12px -2px rgb(39 59 110 / 0.1), 0 2px 4px -2px rgb(39 59 110 / 0.05)',
    none: 'none',
  },

  transitions: {
    fast: '150ms ease-out',
    DEFAULT: '200ms ease-out',
    slow: '300ms ease-out',
  },

  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
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
} as const;

export type DesignTokens = typeof designTokens;
