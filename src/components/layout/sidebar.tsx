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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 166.22 85.48" className="w-16 shrink-0" aria-label="API logo">
          <rect fill="#ffffff" x="148.84" y="0.02" width="17.38" height="85.4"/>
          <path fill="#ffffff" d="M120.17,0c-12.66,0-25.32.12-38,.12V69.64L52.72.06H36.15L0,85.42H16.46L44.43,18,72.29,85.42h9.9v.06H97.38V15.36h22.79c19.34,0,19.46,30.24,0,30.24h-7.59V60.36h7.59C159.66,60.36,159.55,0,120.17,0Z"/>
          <line stroke="#78bc43" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3.5" fill="none" x1="43.9" y1="49.84" x2="43.9" y2="72.34"/>
          <line stroke="#78bc43" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3.5" fill="none" x1="55.15" y1="61.09" x2="32.65" y2="61.09"/>
        </svg>
        <div>
          <p className="text-sm font-normal text-sidebar-foreground leading-tight">
            <span className="font-semibold">Client</span> Questionnaires
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
        "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors group",
        active
          ? "bg-sidebar-primary/15 text-sidebar-primary font-semibold"
          : "text-sidebar-foreground/70 font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-sidebar-primary" />
      )}
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-sidebar-primary" : "text-sidebar-foreground/50")} />
      <span className="flex-1">{item.label}</span>
    </Link>
  )
}
