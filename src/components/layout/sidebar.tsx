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
  ShieldIcon,
  ActivityIcon,
  ChevronRightIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

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
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
          <ShieldIcon className="h-4 w-4" />
        </div>
        <span className="font-heading font-semibold text-sm text-sidebar-foreground leading-tight">
          Questionnaire<br />Platform
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-2">
              <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
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
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors group",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {active && <ChevronRightIcon className="h-3 w-3 opacity-60" />}
    </Link>
  )
}
