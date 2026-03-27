import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { questionnaireTemplate, templateQuestion, question } from "@/lib/db/schema"
import { getRequestSession, requireAdmin } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { asc, eq } from "drizzle-orm"

function requireAuth(session: Awaited<ReturnType<typeof getRequestSession>>) {
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return null
}

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  const authError = requireAuth(session)
  if (authError) return authError

  const templates = await db
    .select()
    .from(questionnaireTemplate)
    .orderBy(asc(questionnaireTemplate.name))

  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  const adminError = requireAdmin(session)
  if (adminError) return adminError

  const body = await req.json()
  const { name, type, description, questions: questionIds } = body

  if (!name || !type) {
    return NextResponse.json({ error: "Name and type are required" }, { status: 400 })
  }

  const [template] = await db
    .insert(questionnaireTemplate)
    .values({ name, type, description })
    .returning()

  if (questionIds?.length) {
    await db.insert(templateQuestion).values(
      questionIds.map((qid: string, i: number) => ({
        templateId: template.id,
        questionId: qid,
        sortOrder: i,
        isRequired: false,
      }))
    )
  }

  await logAudit({
    userId: session!.user.id,
    action: "create",
    entityType: "template",
    entityId: template.id,
    metadata: { name, type },
  })

  return NextResponse.json(template, { status: 201 })
}
