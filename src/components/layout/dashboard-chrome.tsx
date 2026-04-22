"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Sidebar, SidebarBody } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { DashboardTitleProvider } from "@/components/layout/dashboard-title-context"
import { cn } from "@/lib/utils"

interface DashboardChromeProps {
  children: React.ReactNode
  isAdmin: boolean
  userName: string
  userEmail: string
}

export function DashboardChrome({
  children,
  isAdmin,
  userName,
  userEmail,
}: DashboardChromeProps) {
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  React.useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  return (
    <DashboardTitleProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar isAdmin={isAdmin} userName={userName} userEmail={userEmail} />

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            className={cn(
              "flex w-[min(100vw,280px)] max-w-[85vw] flex-col border-sidebar-border !bg-sidebar p-0 text-sidebar-foreground",
              "data-[state=open]:duration-300 sm:max-w-[280px]"
            )}
          >
            <SheetTitle className="sr-only">Main navigation</SheetTitle>
            <SidebarBody
              isAdmin={isAdmin}
              userName={userName}
              userEmail={userEmail}
              onNavigate={() => setMobileNavOpen(false)}
              className="h-full min-h-0 border-0"
            />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            isAdmin={isAdmin}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />
          <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </DashboardTitleProvider>
  )
}
