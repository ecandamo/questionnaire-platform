/**
 * CSV import for the question bank only (see public/samples/question-bank-import-sample.csv).
 * Assign questions to templates from the Admin → Templates UI after import.
 *
 * Columns (header row, case-insensitive; underscores optional):
 * text, type, description, options, is_required, category_name, sort_order
 *
 * - options: pipe-separated (|) for single_select / multi_select
 */

import type { QuestionType } from "@/types"
import { QUESTION_TYPES_WITH_OPTIONS } from "@/types"

const QUESTION_TYPES: QuestionType[] = [
  "short_text",
  "long_text",
  "number",
  "currency",
  "percentage",
  "date",
  "single_select",
  "multi_select",
  "yes_no",
  "section_header",
  "file_upload",
]

export interface NormalizedQuestionCsvRow {
  /** 1-based data row index (excluding header) for error messages */
  rowNumber: number
  text: string
  type: QuestionType
  description: string | null
  options: string[] | null
  isRequired: boolean
  categoryName: string | null
  sortOrder: number | null
}

function normHeaderKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "_")
}

function parseBool(raw: string): boolean {
  const s = raw.trim().toLowerCase()
  if (!s) return false
  return s === "true" || s === "1" || s === "yes" || s === "y"
}

function parseOptions(raw: string): string[] {
  if (!raw.trim()) return []
  return raw
    .split("|")
    .map((o) => o.trim())
    .filter(Boolean)
}

function isQuestionType(s: string): s is QuestionType {
  return (QUESTION_TYPES as string[]).includes(s)
}

/**
 * Map a PapaParse row object (keys from CSV header) to canonical field names.
 */
export function canonicalizeCsvRecord(record: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(record)) {
    out[normHeaderKey(k)] = v ?? ""
  }
  return out
}

export function validateCsvRows(
  records: Record<string, string>[],
  startRowNumber = 2
): { rows: NormalizedQuestionCsvRow[]; errors: { row: number; message: string }[] } {
  const errors: { row: number; message: string }[] = []
  const rows: NormalizedQuestionCsvRow[] = []

  for (let i = 0; i < records.length; i++) {
    const rowNumber = startRowNumber + i
    const c = canonicalizeCsvRecord(records[i]!)

    const text = (c.text ?? "").trim()
    if (!text) {
      errors.push({ row: rowNumber, message: "text is required" })
      continue
    }

    const typeRaw = (c.type ?? "").trim().toLowerCase()
    if (!typeRaw || !isQuestionType(typeRaw)) {
      errors.push({
        row: rowNumber,
        message: `type must be one of: ${QUESTION_TYPES.join(", ")}`,
      })
      continue
    }

    const optionsRaw = (c.options ?? "").trim()
    const optionsList = parseOptions(optionsRaw)
    if (QUESTION_TYPES_WITH_OPTIONS.includes(typeRaw) && optionsList.length === 0) {
      errors.push({
        row: rowNumber,
        message: "options is required for single_select and multi_select (pipe-separated, e.g. A|B|C)",
      })
      continue
    }

    let sortOrder: number | null = null
    const sortRaw = (c.sort_order ?? "").trim()
    if (sortRaw) {
      const n = Number(sortRaw)
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        errors.push({ row: rowNumber, message: "sort_order must be an integer" })
        continue
      }
      sortOrder = n
    }

    const categoryName = (c.category_name ?? "").trim() || null
    const description = (c.description ?? "").trim() || null

    rows.push({
      rowNumber,
      text,
      type: typeRaw,
      description,
      options: QUESTION_TYPES_WITH_OPTIONS.includes(typeRaw) ? optionsList : null,
      isRequired: parseBool(c.is_required ?? ""),
      categoryName,
      sortOrder,
    })
  }

  return { rows, errors }
}
