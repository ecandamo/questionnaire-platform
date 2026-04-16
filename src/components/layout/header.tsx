"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { signOut } from "@/lib/auth-client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOutIcon, UserIcon, ShieldIcon } from "lucide-react"
import { toast } from "sonner"

interface HeaderProps {
  userName: string
  userEmail: string
  isAdmin: boolean
}

export function Header({ userName, userEmail, isAdmin }: HeaderProps) {
  const router = useRouter()

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  async function handleSignOut() {
    await signOut()
    toast.success("Signed out")
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center justify-end gap-2 border-b border-border bg-card px-6 shrink-0">
      {isAdmin && (
        <div className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5">
          <ShieldIcon className="h-3 w-3 text-primary" />
          <span className="text-[11px] font-medium text-primary">Admin</span>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Open user menu for ${userName}`}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium leading-none">{userName}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-none">{userEmail}</p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <UserIcon className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOutIcon className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
