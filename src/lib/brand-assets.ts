/**
 * Canonical paths for brand SVGs in /public/brand/
 * (synced from api-global-solutions-design-system/assets)
 */
export const brandAssets = {
  logos: {
    navy: "/brand/api-logo-navy.svg",
    white: "/brand/api-logo-white.svg",
    green: "/brand/api-logo-green.svg",
    blue: "/brand/api-logo-blue.svg",
  },
  /** Decorative “+” motif — large hero use per brand guidelines */
  plusMotif: "/brand/api-plus-mark.svg",
} as const

export type BrandLogoVariant = keyof typeof brandAssets.logos
