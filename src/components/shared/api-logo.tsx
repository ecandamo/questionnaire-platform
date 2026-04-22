import Image from "next/image"
import { cn } from "@/lib/utils"
import { brandAssets, type BrandLogoVariant } from "@/lib/brand-assets"

interface ApiLogoProps {
  /** Wordmark treatment — default navy for light surfaces */
  variant?: BrandLogoVariant
  className?: string
}

export function ApiLogo({ variant = "navy", className }: ApiLogoProps) {
  return (
    <Image
      src={brandAssets.logos[variant]}
      alt="API Global Solutions"
      width={166}
      height={85}
      className={cn("h-auto w-auto max-w-none object-contain object-left", className)}
      unoptimized
    />
  )
}
