export type QuestionType =
  | "short_text"
  | "long_text"
  | "number"
  | "currency"
  | "percentage"
  | "date"
  | "single_select"
  | "multi_select"
  | "yes_no"
  | "section_header"
  | "file_upload"

export type QuestionStatus = "active" | "inactive" | "archived"

export type QuestionnaireType = "data_request" | "hobson_roi" | "workshop" | "custom"

export type QuestionnaireStatus =
  | "draft"
  | "shared"
  | "in_progress"
  | "submitted"
  | "archived"

export type LinkStatus = "active" | "expired" | "closed"

export type UserRole = "admin" | "user"

export interface QuestionOption {
  label: string
  value: string
}

export const QUESTIONNAIRE_TYPE_LABELS: Record<QuestionnaireType, string> = {
  data_request: "Data Request (Adhoc)",
  hobson_roi: "Hobson ROI",
  workshop: "Workshop",
  custom: "Custom Questionnaire",
}

export const QUESTIONNAIRE_STATUS_LABELS: Record<QuestionnaireStatus, string> = {
  draft: "Draft",
  shared: "Shared",
  in_progress: "In Progress",
  submitted: "Submitted",
  archived: "Archived",
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Short Text",
  long_text: "Long Text",
  number: "Number",
  currency: "Currency",
  percentage: "Percentage",
  date: "Date",
  single_select: "Single Select",
  multi_select: "Multi Select",
  yes_no: "Yes / No",
  section_header: "Section Header",
  file_upload: "File Upload",
}

export const QUESTION_TYPES_WITH_OPTIONS: QuestionType[] = [
  "single_select",
  "multi_select",
]
