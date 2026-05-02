import { NextRequest, NextResponse } from "next/server"
import { questionnaireTemplate, templateQuestion } from "@/lib/db/schema"
import { getRequestSession, requireAdmin } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { withRls } from "@/lib/db/rls-context"
import { asc } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = session.user.role === "admin"

  return withRls(
    { mode: "auth", userId: session.user.id, isAdmin },
    async (tx) => {
      const templates = await tx
        .select()
        .from(questionnaireTemplate)
        .orderBy(asc(questionnaireTemplate.name))

      return NextResponse.json(templates)
    }
  )
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  const adminError = requireAdmin(session)
  if (adminError) return adminError

  const body = await req.json()
  const { name, type, description, questions: questionRows } = body

  if (!name || !type) {
    return NextResponse.json({ error: "Name and type are required" }, { status: 400 })
  }

  return withRls(
    { mode: "auth", userId: session!.user.id, isAdmin: true },
    async (tx) => {
      const [template] = await tx
        .insert(questionnaireTemplate)
        .values({ name, type, description })
        .returning()

      if (!template) return NextResponse.json({ error: "Failed to create template" }, { status: 500 })

      if (Array.isArray(questionRows) && questionRows.length > 0) {
        await tx.insert(templateQuestion).values(
          questionRows.map((q: { questionId: string; isRequired?: boolean }, i: number) => ({
            templateId: template.id,
            questionId: q.questionId,
            sortOrder: i,
            isRequired: q.isRequired ?? false,
          }))
        )
      }

      await logAudit(
        {
          userId: session!.user.id,
          action: "create",
          entityType: "template",
          entityId: template.id,
          metadata: { name, type },
        },
        tx
      )

      return NextResponse.json(template, { status: 201 })
    }
  )
}
