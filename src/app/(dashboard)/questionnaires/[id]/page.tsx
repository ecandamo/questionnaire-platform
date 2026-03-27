import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { notFound } from "next/navigation"
import { QuestionnaireDetailClient } from "./detail-client"

export default async function QuestionnaireDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const { id } = await params

  return (
    <QuestionnaireDetailClient
      id={id}
      isAdmin={session.user.role === "admin"}
      currentUserId={session.user.id}
    />
  )
}
