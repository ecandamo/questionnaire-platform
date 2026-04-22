"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { MenuIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getDashboardHeaderMeta } from "@/lib/dashboard-header-meta"
import { useDashboardTitle } from "@/components/layout/dashboard-title-context"
import { cn } from "@/lib/utils"

interface HeaderProps {
  isAdmin: boolean
  /** Opens the mobile navigation drawer (narrow viewports only). */
  onOpenMobileNav?: () => void
}

export function Header({ isAdmin, onOpenMobileNav }: HeaderProps) {
  const pathname = usePathname()
  const { override } = useDashboardTitle()

  const defaults = React.useMemo(() => getDashboardHeaderMeta(pathname), [pathname])

  const title = override?.title ?? defaults.title
  const subtitle = override?.subtitle ?? defaults.subtitle

  const kickerClass =
    "truncate text-[10.5px] font-bold uppercase tracking-[0.12em] text-sidebar-primary"

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
          {subtitle ? <p className={kickerClass}>{subtitle}</p> : null}
          <h1
            className={cn(
              "truncate font-extrabold leading-[1.15] tracking-[-0.015em] text-foreground text-[22px]",
              subtitle && "mt-0.5"
            )}
          >
            {title}
          </h1>
        </div>
      </div>

      <Badge
        variant={isAdmin ? "default" : "secondary"}
        className="shrink-0 text-xs capitalize"
      >
        {isAdmin ? "admin" : "user"}
      </Badge>
    </header>
  )
}
