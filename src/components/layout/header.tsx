"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { MenuIcon, ShieldIcon } from "lucide-react"
import { getDashboardHeaderMeta } from "@/lib/dashboard-header-meta"
import { useDashboardTitle } from "@/components/layout/dashboard-title-context"

interface HeaderProps {
  isAdmin: boolean
  /** Opens the mobile navigation drawer (narrow viewports only). */
  onOpenMobileNav?: () => void
}

export function Header({ isAdmin, onOpenMobileNav }: HeaderProps) {
  const pathname = usePathname()
  const { override } = useDashboardTitle()

  const defaults = React.useMemo(() => getDashboardHeaderMeta(pathname), [pathname])

  const eyebrow = override?.eyebrow ?? defaults.eyebrow
  const title = override?.title ?? defaults.title
  const subtitle = override?.subtitle ?? defaults.subtitle

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 md:gap-6 md:px-7">
      <div className="flex min-w-0 flex-1 items-start gap-2 md:items-start md:gap-3">
        {onOpenMobileNav ? (
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="mt-1 shrink-0 rounded-lg p-2 text-foreground hover:bg-muted md:hidden"
            aria-label="Open navigation menu"
          >
            <MenuIcon className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-sidebar-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-0.5 truncate font-extrabold leading-[1.15] tracking-[-0.015em] text-foreground text-[22px]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{subtitle}</p>
        ) : null}
        </div>
      </div>

      {isAdmin && (
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5">
          <ShieldIcon className="h-3 w-3 text-primary" aria-hidden />
          <span className="text-[11px] font-medium text-primary">Admin</span>
        </div>
      )}
    </header>
  )
}
