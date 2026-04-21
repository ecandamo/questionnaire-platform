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
 * Design Tokens — Travel/Hospitality SaaS Dashboard
 *
 * Deep navy primary for executive trust, ocean teal secondary for
 * travel association, warm amber accent for hospitality warmth.
 *
 * Typography: Plus Jakarta Sans (headings) + Inter (body)
 * Style: Clean minimalism with subtle navy-tinted elevation
 *
 * All accent/warning colors are WCAG AA 3:1 compliant against white.
 */

export const designTokens = {
  colors: {
    primary: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E3A8A',
      900: '#1E2756',
      950: '#0F1629',
      DEFAULT: '#1E3A8A',
      foreground: '#FFFFFF',
    },

    secondary: {
      50: '#F0FDFA',
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#14B8A6',
      600: '#0D9488',
      700: '#0F766E',
      800: '#115E59',
      900: '#134E4A',
      950: '#042F2E',
      DEFAULT: '#0F766E',
      foreground: '#FFFFFF',
    },

    accent: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
      950: '#451A03',
      DEFAULT: '#B45309',
      foreground: '#FFFFFF',
    },

    neutral: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
      950: '#020617',
    },

    semantic: {
      success: {
        light: '#D1FAE5',
        DEFAULT: '#059669',
        dark: '#065F46',
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
        light: '#DBEAFE',
        DEFAULT: '#2563EB',
        dark: '#1E3A8A',
        foreground: '#FFFFFF',
      },
    },

    chart: {
      1: '#1E3A8A',
      2: '#0F766E',
      3: '#B45309',
      4: '#6D28D9',
      5: '#059669',
    },
  },

  fonts: {
    heading: {
      family: "'Plus Jakarta Sans', sans-serif",
      weights: { medium: 500, semibold: 600, bold: 700 },
      letterSpacing: '-0.025em',
    },
    body: {
      family: "'Inter', sans-serif",
      weights: { light: 300, regular: 400, medium: 500, semibold: 600 },
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
    card: '0 1px 3px 0 rgb(30 58 138 / 0.04), 0 1px 2px -1px rgb(30 58 138 / 0.03)',
    cardHover:
      '0 4px 12px -2px rgb(30 58 138 / 0.08), 0 2px 4px -2px rgb(30 58 138 / 0.04)',
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
