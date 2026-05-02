-- ============================================================================
-- Migration: Row Level Security (all application tables)
-- ============================================================================
--
-- IMPORTANT: Run `npm run db:backup` BEFORE applying this migration to production.
--
-- Better Auth tables (user, session, account, verification) are EXCLUDED from RLS
-- so that Better Auth session resolution always works without GUC context.
--
-- All other app tables get:
--   ENABLE ROW LEVEL SECURITY  — turns on the RLS system for the table
--   FORCE ROW LEVEL SECURITY   — applies policies even to the table owner role
--                                (Neon connects as neondb_owner which owns the tables)
--
-- Policies use three modes set via `set_config('app.rls_mode', …, true)`:
--   auth               — authenticated internal user (dashboard routes)
--   share_owner        — external respondent using an owner share_link token
--   share_contributor  — external respondent using a collaborator token
--
-- The `true` flag in set_config means "local to current transaction" (SET LOCAL).
-- GUCs default to empty string when not set, so no policy matches unless the
-- route explicitly calls withRls() from src/lib/db/rls-context.ts.
-- ============================================================================

-- ── questionnaire ─────────────────────────────────────────────────────────────

ALTER TABLE "questionnaire" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questionnaire" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Owner of the questionnaire can do everything
CREATE POLICY "questionnaire_owner_all" ON "questionnaire"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND "owner_id" = current_setting('app.user_id', true)
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND "owner_id" = current_setting('app.user_id', true)
  );
--> statement-breakpoint

-- Admin can do everything
CREATE POLICY "questionnaire_admin_all" ON "questionnaire"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  );
--> statement-breakpoint

-- Share owner can read the questionnaire
CREATE POLICY "questionnaire_share_owner_select" ON "questionnaire"
  FOR SELECT
  USING (
    current_setting('app.rls_mode', true) = 'share_owner'
    AND "id" IN (
      SELECT "questionnaire_id" FROM "share_link"
      WHERE "token" = current_setting('app.share_token', true)
    )
  );
--> statement-breakpoint

-- Contributor can read the questionnaire
CREATE POLICY "questionnaire_share_contributor_select" ON "questionnaire"
  FOR SELECT
  USING (
    current_setting('app.rls_mode', true) = 'share_contributor'
    AND "id" IN (
      SELECT "questionnaire_id" FROM "response_collaborator"
      WHERE "token" = current_setting('app.collaborator_token', true)
    )
  );
--> statement-breakpoint

-- ── questionnaire_question ────────────────────────────────────────────────────

ALTER TABLE "questionnaire_question" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questionnaire_question" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "questionnaire_question_owner_all" ON "questionnaire_question"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND "questionnaire_id" IN (
      SELECT "id" FROM "questionnaire"
      WHERE "owner_id" = current_setting('app.user_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND "questionnaire_id" IN (
      SELECT "id" FROM "questionnaire"
      WHERE "owner_id" = current_setting('app.user_id', true)
    )
  );
--> statement-breakpoint

CREATE POLICY "questionnaire_question_admin_all" ON "questionnaire_question"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  );
--> statement-breakpoint

CREATE POLICY "questionnaire_question_share_owner_select" ON "questionnaire_question"
  FOR SELECT
  USING (
    current_setting('app.rls_mode', true) = 'share_owner'
    AND "questionnaire_id" IN (
      SELECT "questionnaire_id" FROM "share_link"
      WHERE "token" = current_setting('app.share_token', true)
    )
  );
--> statement-breakpoint

CREATE POLICY "questionnaire_question_share_contributor_select" ON "questionnaire_question"
  FOR SELECT
  USING (
    current_setting('app.rls_mode', true) = 'share_contributor'
    AND "questionnaire_id" IN (
      SELECT "questionnaire_id" FROM "response_collaborator"
      WHERE "token" = current_setting('app.collaborator_token', true)
    )
  );
--> statement-breakpoint

-- ── client ────────────────────────────────────────────────────────────────────

ALTER TABLE "client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Any authenticated user can read/write clients (no per-client ownership check in the app)
CREATE POLICY "client_auth_all" ON "client"
  FOR ALL
  USING (current_setting('app.rls_mode', true) = 'auth')
  WITH CHECK (current_setting('app.rls_mode', true) = 'auth');
--> statement-breakpoint

-- ── share_link ────────────────────────────────────────────────────────────────

ALTER TABLE "share_link" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "share_link" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "share_link_owner_all" ON "share_link"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND "questionnaire_id" IN (
      SELECT "id" FROM "questionnaire"
      WHERE "owner_id" = current_setting('app.user_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND "questionnaire_id" IN (
      SELECT "id" FROM "questionnaire"
      WHERE "owner_id" = current_setting('app.user_id', true)
    )
  );
--> statement-breakpoint

CREATE POLICY "share_link_admin_all" ON "share_link"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  );
--> statement-breakpoint

-- Share owner can see their own link by token (for expiry check)
CREATE POLICY "share_link_share_owner_select" ON "share_link"
  FOR SELECT
  USING (
    current_setting('app.rls_mode', true) = 'share_owner'
    AND "token" = current_setting('app.share_token', true)
  );
--> statement-breakpoint

-- ── response ──────────────────────────────────────────────────────────────────

ALTER TABLE "response" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "response" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "response_owner_all" ON "response"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND "questionnaire_id" IN (
      SELECT "id" FROM "questionnaire"
      WHERE "owner_id" = current_setting('app.user_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND "questionnaire_id" IN (
      SELECT "id" FROM "questionnaire"
      WHERE "owner_id" = current_setting('app.user_id', true)
    )
  );
--> statement-breakpoint

CREATE POLICY "response_admin_all" ON "response"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  );
--> statement-breakpoint

-- Share owner can read + write (upsert) their own response
CREATE POLICY "response_share_owner_all" ON "response"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'share_owner'
    AND "share_link_id" IN (
      SELECT "id" FROM "share_link"
      WHERE "token" = current_setting('app.share_token', true)
    )
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'share_owner'
    AND "share_link_id" IN (
      SELECT "id" FROM "share_link"
      WHERE "token" = current_setting('app.share_token', true)
    )
  );
--> statement-breakpoint

-- Contributor can only read their own response
CREATE POLICY "response_share_contributor_select" ON "response"
  FOR SELECT
  USING (
    current_setting('app.rls_mode', true) = 'share_contributor'
    AND "id" IN (
      SELECT "response_id" FROM "response_collaborator"
      WHERE "token" = current_setting('app.collaborator_token', true)
    )
  );
--> statement-breakpoint

-- ── response_collaborator ─────────────────────────────────────────────────────

ALTER TABLE "response_collaborator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "response_collaborator" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "response_collaborator_owner_all" ON "response_collaborator"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND "questionnaire_id" IN (
      SELECT "id" FROM "questionnaire"
      WHERE "owner_id" = current_setting('app.user_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND "questionnaire_id" IN (
      SELECT "id" FROM "questionnaire"
      WHERE "owner_id" = current_setting('app.user_id', true)
    )
  );
--> statement-breakpoint

CREATE POLICY "response_collaborator_admin_all" ON "response_collaborator"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  );
--> statement-breakpoint

-- Share owner can see and manage collaborators
CREATE POLICY "response_collaborator_share_owner_all" ON "response_collaborator"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'share_owner'
    AND "response_id" IN (
      SELECT "id" FROM "response"
      WHERE "share_link_id" IN (
        SELECT "id" FROM "share_link"
        WHERE "token" = current_setting('app.share_token', true)
      )
    )
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'share_owner'
    AND "response_id" IN (
      SELECT "id" FROM "response"
      WHERE "share_link_id" IN (
        SELECT "id" FROM "share_link"
        WHERE "token" = current_setting('app.share_token', true)
      )
    )
  );
--> statement-breakpoint

-- Contributor can read + update their own row (activate invite, mark complete)
CREATE POLICY "response_collaborator_self_select" ON "response_collaborator"
  FOR SELECT
  USING (
    current_setting('app.rls_mode', true) = 'share_contributor'
    AND "token" = current_setting('app.collaborator_token', true)
  );
--> statement-breakpoint

CREATE POLICY "response_collaborator_self_update" ON "response_collaborator"
  FOR UPDATE
  USING (
    current_setting('app.rls_mode', true) = 'share_contributor'
    AND "token" = current_setting('app.collaborator_token', true)
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'share_contributor'
    AND "token" = current_setting('app.collaborator_token', true)
  );
--> statement-breakpoint

-- Contributor also needs to see fellow collaborators (for share/[token] overview)
CREATE POLICY "response_collaborator_same_response_select" ON "response_collaborator"
  FOR SELECT
  USING (
    current_setting('app.rls_mode', true) = 'share_contributor'
    AND "response_id" IN (
      SELECT "response_id" FROM "response_collaborator"
      WHERE "token" = current_setting('app.collaborator_token', true)
    )
  );
--> statement-breakpoint

-- ── question_assignment ───────────────────────────────────────────────────────

ALTER TABLE "question_assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_assignment" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "question_assignment_owner_all" ON "question_assignment"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND "response_id" IN (
      SELECT "id" FROM "response"
      WHERE "questionnaire_id" IN (
        SELECT "id" FROM "questionnaire"
        WHERE "owner_id" = current_setting('app.user_id', true)
      )
    )
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND "response_id" IN (
      SELECT "id" FROM "response"
      WHERE "questionnaire_id" IN (
        SELECT "id" FROM "questionnaire"
        WHERE "owner_id" = current_setting('app.user_id', true)
      )
    )
  );
--> statement-breakpoint

CREATE POLICY "question_assignment_admin_all" ON "question_assignment"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  );
--> statement-breakpoint

-- Share owner can see and manage all assignments for their response
CREATE POLICY "question_assignment_share_owner_all" ON "question_assignment"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'share_owner'
    AND "response_id" IN (
      SELECT "id" FROM "response"
      WHERE "share_link_id" IN (
        SELECT "id" FROM "share_link"
        WHERE "token" = current_setting('app.share_token', true)
      )
    )
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'share_owner'
    AND "response_id" IN (
      SELECT "id" FROM "response"
      WHERE "share_link_id" IN (
        SELECT "id" FROM "share_link"
        WHERE "token" = current_setting('app.share_token', true)
      )
    )
  );
--> statement-breakpoint

-- Contributor can see their own assignments
CREATE POLICY "question_assignment_contributor_select" ON "question_assignment"
  FOR SELECT
  USING (
    current_setting('app.rls_mode', true) = 'share_contributor'
    AND "collaborator_id" IN (
      SELECT "id" FROM "response_collaborator"
      WHERE "token" = current_setting('app.collaborator_token', true)
    )
  );
--> statement-breakpoint

-- ── answer ────────────────────────────────────────────────────────────────────

ALTER TABLE "answer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "answer" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "answer_owner_all" ON "answer"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND "response_id" IN (
      SELECT "id" FROM "response"
      WHERE "questionnaire_id" IN (
        SELECT "id" FROM "questionnaire"
        WHERE "owner_id" = current_setting('app.user_id', true)
      )
    )
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND "response_id" IN (
      SELECT "id" FROM "response"
      WHERE "questionnaire_id" IN (
        SELECT "id" FROM "questionnaire"
        WHERE "owner_id" = current_setting('app.user_id', true)
      )
    )
  );
--> statement-breakpoint

CREATE POLICY "answer_admin_all" ON "answer"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  );
--> statement-breakpoint

-- Share owner can read + write answers for their response
CREATE POLICY "answer_share_owner_all" ON "answer"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'share_owner'
    AND "response_id" IN (
      SELECT "id" FROM "response"
      WHERE "share_link_id" IN (
        SELECT "id" FROM "share_link"
        WHERE "token" = current_setting('app.share_token', true)
      )
    )
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'share_owner'
    AND "response_id" IN (
      SELECT "id" FROM "response"
      WHERE "share_link_id" IN (
        SELECT "id" FROM "share_link"
        WHERE "token" = current_setting('app.share_token', true)
      )
    )
  );
--> statement-breakpoint

-- Contributor can read + write their response's answers
CREATE POLICY "answer_share_contributor_all" ON "answer"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'share_contributor'
    AND "response_id" IN (
      SELECT "response_id" FROM "response_collaborator"
      WHERE "token" = current_setting('app.collaborator_token', true)
    )
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'share_contributor'
    AND "response_id" IN (
      SELECT "response_id" FROM "response_collaborator"
      WHERE "token" = current_setting('app.collaborator_token', true)
    )
  );
--> statement-breakpoint

-- ── question (bank) ───────────────────────────────────────────────────────────

ALTER TABLE "question" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Any authenticated user can read questions; admin can do everything
CREATE POLICY "question_auth_select" ON "question"
  FOR SELECT
  USING (current_setting('app.rls_mode', true) = 'auth');
--> statement-breakpoint

CREATE POLICY "question_admin_all" ON "question"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  );
--> statement-breakpoint

-- ── question_category ─────────────────────────────────────────────────────────

ALTER TABLE "question_category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_category" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "question_category_auth_select" ON "question_category"
  FOR SELECT
  USING (current_setting('app.rls_mode', true) = 'auth');
--> statement-breakpoint

CREATE POLICY "question_category_admin_all" ON "question_category"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  );
--> statement-breakpoint

-- ── questionnaire_template ────────────────────────────────────────────────────

ALTER TABLE "questionnaire_template" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questionnaire_template" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "questionnaire_template_auth_select" ON "questionnaire_template"
  FOR SELECT
  USING (current_setting('app.rls_mode', true) = 'auth');
--> statement-breakpoint

CREATE POLICY "questionnaire_template_admin_all" ON "questionnaire_template"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  );
--> statement-breakpoint

-- ── template_question ─────────────────────────────────────────────────────────

ALTER TABLE "template_question" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "template_question" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "template_question_auth_select" ON "template_question"
  FOR SELECT
  USING (current_setting('app.rls_mode', true) = 'auth');
--> statement-breakpoint

CREATE POLICY "template_question_admin_all" ON "template_question"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  );
--> statement-breakpoint

-- ── questionnaire_category ────────────────────────────────────────────────────

ALTER TABLE "questionnaire_category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questionnaire_category" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "questionnaire_category_auth_select" ON "questionnaire_category"
  FOR SELECT
  USING (current_setting('app.rls_mode', true) = 'auth');
--> statement-breakpoint

CREATE POLICY "questionnaire_category_admin_all" ON "questionnaire_category"
  FOR ALL
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  );
--> statement-breakpoint

-- ── audit_log ─────────────────────────────────────────────────────────────────

ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Only admins can read the audit log; any auth can write (INSERT via logAudit)
CREATE POLICY "audit_log_admin_select" ON "audit_log"
  FOR SELECT
  USING (
    current_setting('app.rls_mode', true) = 'auth'
    AND current_setting('app.is_admin', true) = 'true'
  );
--> statement-breakpoint

CREATE POLICY "audit_log_auth_insert" ON "audit_log"
  FOR INSERT
  WITH CHECK (current_setting('app.rls_mode', true) = 'auth');
--> statement-breakpoint

-- Share routes also write audit events (e.g. submit)
CREATE POLICY "audit_log_share_owner_insert" ON "audit_log"
  FOR INSERT
  WITH CHECK (current_setting('app.rls_mode', true) = 'share_owner');
