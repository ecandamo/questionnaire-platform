import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { DashboardChrome } from "@/components/layout/dashboard-chrome"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/login")
  }

  const isAdmin = session.user.role === "admin"

  return (
    <DashboardChrome
      isAdmin={isAdmin}
      userName={session.user.name}
      userEmail={session.user.email}
    >
      {children}
    </DashboardChrome>
  )
}
