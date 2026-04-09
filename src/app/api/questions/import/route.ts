import { NextRequest, NextResponse } from "next/server"
import Papa from "papaparse"
import { db } from "@/lib/db"
import { question, questionCategory } from "@/lib/db/schema"
import { getRequestSession, requireAdmin } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { validateCsvRows } from "@/lib/question-csv-import"
import { eq } from "drizzle-orm"

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  const adminError = requireAdmin(session)
  if (adminError) return adminError

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const fileEntry = formData.get("file")
  if (!fileEntry || typeof fileEntry === "string") {
    return NextResponse.json({ error: "Missing CSV file (field name: file)" }, { status: 400 })
  }

  const createMissingCategories = formData.get("createMissingCategories") === "true"
  const file = fileEntry as File
  const fileName = file.name || "import.csv"

  const csvText = await file.text()
  if (!csvText.trim()) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 })
  }

  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    transform: (value) => (value == null ? "" : String(value)),
  })

  if (parsed.errors.length > 0) {
    const first = parsed.errors[0]
    return NextResponse.json(
      {
        error: "CSV parse error",
        details: first?.message ?? "Unknown",
        row: first?.row,
      },
      { status: 400 }
    )
  }

  const stringRecords = (parsed.data as Record<string, string>[]).filter((r) =>
    Object.values(r).some((v) => String(v).trim() !== "")
  )

  const { rows, errors: validationErrors } = validateCsvRows(stringRecords)
  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", errors: validationErrors },
      { status: 400 }
    )
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No data rows in CSV" }, { status: 400 })
  }

  const categories = await db.select().from(questionCategory)
  const categoryByName = new Map(categories.map((c) => [c.name, c.id]))

  const categoryErrors: { row: number; message: string }[] = []
  for (const row of rows) {
    if (row.categoryName && !categoryByName.has(row.categoryName) && !createMissingCategories) {
      categoryErrors.push({
        row: row.rowNumber,
        message: `Unknown category_name "${row.categoryName}" — enable "Create missing categories" or fix the name`,
      })
    }
  }
  if (categoryErrors.length > 0) {
    return NextResponse.json({ error: "Validation failed", errors: categoryErrors }, { status: 400 })
  }

  const newQuestionIds: string[] = []

  async function rollback() {
    for (const id of newQuestionIds) {
      await db.delete(question).where(eq(question.id, id))
    }
  }

  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!

      let categoryId: string | null = null
      if (row.categoryName) {
        let cid = categoryByName.get(row.categoryName)
        if (!cid && createMissingCategories) {
          const [created] = await db
            .insert(questionCategory)
            .values({
              name: row.categoryName,
              description: null,
              sortOrder: 0,
            })
            .returning()
          cid = created!.id
          categoryByName.set(row.categoryName, cid)
          await logAudit({
            userId: session!.user.id,
            action: "create",
            entityType: "question_category",
            entityId: cid,
            metadata: { name: row.categoryName, source: "csv_import" },
          })
        }
        categoryId = cid ?? null
      }

      const sortOrder = row.sortOrder ?? i

      const [qRow] = await db
        .insert(question)
        .values({
          text: row.text,
          type: row.type,
          description: row.description,
          options: row.options,
          isRequired: row.isRequired,
          categoryId,
          sortOrder,
          status: "active",
          createdBy: session!.user.id,
        })
        .returning()

      if (!qRow) throw new Error("Insert question returned no row")
      newQuestionIds.push(qRow.id)
    }

    await logAudit({
      userId: session!.user.id,
      action: "import",
      entityType: "question",
      entityId: null,
      metadata: {
        fileName,
        created: { questions: rows.length },
      },
    })

    return NextResponse.json({
      success: true,
      created: {
        questions: rows.length,
      },
      errors: [] as { row: number; message: string }[],
    })
  } catch (e) {
    console.error("CSV import failed:", e)
    await rollback()
    return NextResponse.json(
      {
        error: "Import failed; no changes were applied",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    )
  }
}
