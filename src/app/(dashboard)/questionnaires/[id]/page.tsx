import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { questionnaireCategory } from "@/lib/db/schema"
import { asc } from "drizzle-orm"
import { QuestionnaireDetailClient } from "./detail-client"

export default async function QuestionnaireDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const { id } = await params

  const categoryRows = await db
    .select({ slug: questionnaireCategory.slug, label: questionnaireCategory.label })
    .from(questionnaireCategory)
    .orderBy(asc(questionnaireCategory.sortOrder))

  const typeLabels: Record<string, string> = {}
  for (const row of categoryRows) typeLabels[row.slug] = row.label

  return (
    <QuestionnaireDetailClient
      id={id}
      isAdmin={session.user.role === "admin"}
      currentUserId={session.user.id}
      typeLabels={typeLabels}
    />
  )
}
