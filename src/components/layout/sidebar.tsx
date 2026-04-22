"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ClipboardListIcon,
  LayoutDashboardIcon,
  UsersIcon,
  BookOpenIcon,
  LayoutTemplateIcon,
  BuildingIcon,
  ActivityIcon,
  LogOutIcon,
  UserIcon,
  SettingsIcon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { ApiLogo } from "@/components/shared/api-logo"
import { signOut } from "@/lib/auth-client"
import { toast } from "sonner"

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

export interface SidebarBodyProps {
  isAdmin: boolean
  userName: string
  userEmail: string
  /** Close mobile drawer after navigation */
  onNavigate?: () => void
  className?: string
}

export function SidebarBody({
  isAdmin,
  userName,
  userEmail,
  onNavigate,
  className,
}: SidebarBodyProps) {
  const pathname = usePathname()
  const router = useRouter()

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  async function handleSignOut() {
    onNavigate?.()
    await signOut()
    toast.success("Signed out")
    router.push("/login")
    router.refresh()
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      {/* h-16 matches main <Header /> height; keep subtle rail divider color */}
      <div className="flex h-16 shrink-0 items-center gap-0 border-b border-white/5 px-4">
        <ApiLogo variant="white" className="h-6 w-[88px] shrink-0" />
        <span className="min-w-0 -translate-x-4 text-[8.5px] font-bold uppercase leading-[1.15] tracking-[0.1em] text-sidebar-primary sm:text-[9px] sm:tracking-[0.11em]">
          <span className="block">Client</span>
          <span className="block">Questionnaires</span>
        </span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
        <p className="px-3 pb-1 pt-2 text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/30">
          Workspace
        </p>
        <div className="space-y-0.5">
          {mainNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        {isAdmin && (
          <>
            <p className="px-3 pb-1 pt-5 text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/30">
              Admin
            </p>
            <div className="space-y-0.5">
              {adminNav.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-3 border-t border-white/5 p-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold leading-tight">{userName}</p>
          <p className="truncate text-[10.5px] text-white/50">{userEmail}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label="Account menu"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold">{userName}</p>
                <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

interface SidebarProps {
  isAdmin: boolean
  userName: string
  userEmail: string
}

export function Sidebar({ isAdmin, userName, userEmail }: SidebarProps) {
  return (
    <aside className="hidden h-full w-[232px] shrink-0 flex-col border-r border-sidebar-border md:flex">
      <SidebarBody isAdmin={isAdmin} userName={userName} userEmail={userEmail} />
    </aside>
  )
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={() => onNavigate?.()}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors",
        active
          ? "bg-primary font-semibold text-white shadow-none"
          : "font-medium text-white/60 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          active ? "text-sidebar-primary" : "text-white/50"
        )}
      />
      <span className="flex-1 text-left">{item.label}</span>
    </Link>
  )
}
