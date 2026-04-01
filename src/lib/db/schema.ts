import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core"

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["admin", "user"])

export const questionTypeEnum = pgEnum("question_type", [
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
])

export const questionStatusEnum = pgEnum("question_status", [
  "active",
  "inactive",
  "archived",
])

export const questionnaireTypeEnum = pgEnum("questionnaire_type", [
  "data_request",
  "hobson_roi",
  "workshop",
  "custom",
])

export const questionnaireStatusEnum = pgEnum("questionnaire_status", [
  "draft",
  "shared",
  "in_progress",
  "submitted",
  "archived",
])

export const linkStatusEnum = pgEnum("link_status", [
  "active",
  "expired",
  "closed",
])

export const collaboratorRoleEnum = pgEnum("collaborator_role", [
  "owner",
  "contributor",
])

export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "active",
  "completed",
])

// ─── Better Auth tables ───────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  role: text("role").notNull().default("user"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// ─── Application tables ───────────────────────────────────────────────────────

export const client = pgTable("client", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  industry: text("industry"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
})

export const questionCategory = pgTable("question_category", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  status: questionStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const question = pgTable("question", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => questionCategory.id, {
    onDelete: "set null",
  }),
  text: text("text").notNull(),
  description: text("description"),
  type: questionTypeEnum("type").notNull(),
  options: jsonb("options").$type<string[]>(),
  isRequired: boolean("is_required").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  status: questionStatusEnum("status").notNull().default("active"),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const questionnaireTemplate = pgTable("questionnaire_template", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: questionnaireTypeEnum("type").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const templateQuestion = pgTable("template_question", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => questionnaireTemplate.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => question.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  isRequired: boolean("is_required").notNull().default(false),
})

export const questionnaire = pgTable("questionnaire", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  type: questionnaireTypeEnum("type").notNull(),
  status: questionnaireStatusEnum("status").notNull().default("draft"),
  clientId: uuid("client_id").references(() => client.id, { onDelete: "set null" }),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => questionnaireTemplate.id, {
    onDelete: "set null",
  }),
  publishedAt: timestamp("published_at"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const questionnaireQuestion = pgTable("questionnaire_question", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionnaireId: uuid("questionnaire_id")
    .notNull()
    .references(() => questionnaire.id, { onDelete: "cascade" }),
  sourceQuestionId: uuid("source_question_id").references(() => question.id, {
    onDelete: "set null",
  }),
  text: text("text").notNull(),
  description: text("description"),
  type: questionTypeEnum("type").notNull(),
  options: jsonb("options").$type<string[]>(),
  isRequired: boolean("is_required").notNull().default(false),
  isHidden: boolean("is_hidden").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isCustom: boolean("is_custom").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const shareLink = pgTable("share_link", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionnaireId: uuid("questionnaire_id")
    .notNull()
    .references(() => questionnaire.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  status: linkStatusEnum("status").notNull().default("active"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const response = pgTable("response", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionnaireId: uuid("questionnaire_id")
    .notNull()
    .references(() => questionnaire.id, { onDelete: "cascade" }),
  shareLinkId: uuid("share_link_id").references(() => shareLink.id, {
    onDelete: "set null",
  }),
  respondentName: text("respondent_name"),
  respondentEmail: text("respondent_email"),
  status: text("status").notNull().default("in_progress"), // in_progress | submitted
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const answer = pgTable("answer", {
  id: uuid("id").primaryKey().defaultRandom(),
  responseId: uuid("response_id")
    .notNull()
    .references(() => response.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questionnaireQuestion.id, { onDelete: "cascade" }),
  value: text("value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const responseCollaborator = pgTable("response_collaborator", {
  id: uuid("id").primaryKey().defaultRandom(),
  responseId: uuid("response_id")
    .notNull()
    .references(() => response.id, { onDelete: "cascade" }),
  questionnaireId: uuid("questionnaire_id")
    .notNull()
    .references(() => questionnaire.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name"),
  token: text("token").notNull().unique(),
  role: collaboratorRoleEnum("role").notNull().default("contributor"),
  inviteStatus: inviteStatusEnum("invite_status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const questionAssignment = pgTable("question_assignment", {
  id: uuid("id").primaryKey().defaultRandom(),
  responseId: uuid("response_id")
    .notNull()
    .references(() => response.id, { onDelete: "cascade" }),
  questionnaireQuestionId: uuid("questionnaire_question_id")
    .notNull()
    .references(() => questionnaireQuestion.id, { onDelete: "cascade" }),
  collaboratorId: uuid("collaborator_id").references(() => responseCollaborator.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ─── Type exports ─────────────────────────────────────────────────────────────

export type User = typeof user.$inferSelect
export type Client = typeof client.$inferSelect
export type Question = typeof question.$inferSelect
export type QuestionCategory = typeof questionCategory.$inferSelect
export type QuestionnaireTemplate = typeof questionnaireTemplate.$inferSelect
export type TemplateQuestion = typeof templateQuestion.$inferSelect
export type Questionnaire = typeof questionnaire.$inferSelect
export type QuestionnaireQuestion = typeof questionnaireQuestion.$inferSelect
export type ShareLink = typeof shareLink.$inferSelect
export type Response = typeof response.$inferSelect
export type Answer = typeof answer.$inferSelect
export type ResponseCollaborator = typeof responseCollaborator.$inferSelect
export type QuestionAssignment = typeof questionAssignment.$inferSelect
export type AuditLog = typeof auditLog.$inferSelect
