import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { QuestionnairesClient } from "./questionnaires-client"

export default async function QuestionnairesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  return (
    <QuestionnairesClient
      isAdmin={session.user.role === "admin"}
      currentUserId={session.user.id}
    />
  )
}
