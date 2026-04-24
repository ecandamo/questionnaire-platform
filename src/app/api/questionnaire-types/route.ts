import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { questionnaireCategory } from "@/lib/db/schema"
import { getRequestSession, requireAuth, requireAdmin } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import {
  DEFAULT_QUESTIONNAIRE_TYPE_COLOR,
  QUESTIONNAIRE_TYPE_COLOR_OPTIONS,
} from "@/lib/questionnaire-type-colors"
import { asc, eq } from "drizzle-orm"

function deriveSlug(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 64)
}

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  const authError = requireAuth(session)
  if (authError) return authError

  const url = new URL(req.url)
  const includeInactive = url.searchParams.get("all") === "true"

  const rows = await db
    .select()
    .from(questionnaireCategory)
    .where(includeInactive ? undefined : eq(questionnaireCategory.isActive, true))
    .orderBy(asc(questionnaireCategory.sortOrder), asc(questionnaireCategory.label))

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  const adminError = requireAdmin(session)
  if (adminError) return adminError

  const body = await req.json()
  const { label, color } = body as { label?: string; color?: string }

  if (!label?.trim()) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 })
  }

  const slug = deriveSlug(label.trim())

  if (!slug) {
    return NextResponse.json({ error: "Label must contain at least one alphanumeric character" }, { status: 400 })
  }

  if (slug === "custom") {
    return NextResponse.json({ error: 'The slug "custom" is reserved' }, { status: 400 })
  }

  const existing = await db
    .select({ slug: questionnaireCategory.slug })
    .from(questionnaireCategory)
    .where(eq(questionnaireCategory.slug, slug))

  if (existing.length > 0) {
    return NextResponse.json({ error: `A type with slug "${slug}" already exists` }, { status: 409 })
  }

  const maxOrder = await db
    .select({ sortOrder: questionnaireCategory.sortOrder })
    .from(questionnaireCategory)
    .orderBy(asc(questionnaireCategory.sortOrder))

  const nextOrder = maxOrder.length > 0 ? (maxOrder[maxOrder.length - 1]!.sortOrder + 1) : 0

  const allowedColors = new Set<string>(QUESTIONNAIRE_TYPE_COLOR_OPTIONS.map((option) => option.value))
  const normalizedColor = color && allowedColors.has(color)
    ? color
    : DEFAULT_QUESTIONNAIRE_TYPE_COLOR

  const [created] = await db
    .insert(questionnaireCategory)
    .values({
      slug,
      label: label.trim(),
      color: normalizedColor,
      isSystem: false,
      isActive: true,
      sortOrder: nextOrder,
    })
    .returning()

  await logAudit({
    userId: session!.user.id,
    action: "create",
    entityType: "questionnaire_category",
    entityId: slug,
    metadata: { label: label.trim(), slug, color: normalizedColor },
  })

  return NextResponse.json(created, { status: 201 })
}
