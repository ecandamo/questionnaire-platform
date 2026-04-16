"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ClipboardListIcon,
  LayoutDashboardIcon,
  UsersIcon,
  BookOpenIcon,
  LayoutTemplateIcon,
  BuildingIcon,
  ActivityIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ApiLogo } from "@/components/shared/api-logo"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
}

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboardIcon },
  { label: "Questionnaires", href: "/questionnaires", icon: ClipboardListIcon },
  { label: "Clients", href: "/clients", icon: BuildingIcon },
]

const adminNav: NavItem[] = [
  { label: "Question Bank", href: "/admin/question-bank", icon: BookOpenIcon, adminOnly: true },
  { label: "Templates", href: "/admin/templates", icon: LayoutTemplateIcon, adminOnly: true },
  { label: "Users", href: "/admin/users", icon: UsersIcon, adminOnly: true },
  { label: "Audit Log", href: "/admin/audit-log", icon: ActivityIcon, adminOnly: true },
]

interface SidebarProps {
  isAdmin: boolean
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <aside className="flex h-full w-60 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-4">
        <ApiLogo variant="white" className="w-16 shrink-0" />
        <div>
          <p className="text-sm font-normal text-sidebar-foreground leading-tight">
            <span className="font-semibold">Sales</span> Questionnaires
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        {isAdmin && (
          <>
            <div className="pt-5 pb-1.5 px-1">
              <p className="text-[10px] font-medium text-sidebar-foreground/40 uppercase tracking-widest">
                Admin
              </p>
            </div>
            {adminNav.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-primary/15 text-sidebar-primary font-semibold"
          : "text-sidebar-foreground/70 font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-sidebar-primary" : "text-sidebar-foreground/50")} />
      <span className="flex-1">{item.label}</span>
    </Link>
  )
}
