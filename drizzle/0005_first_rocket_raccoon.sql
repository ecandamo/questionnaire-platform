ALTER TABLE "questionnaire_category" ADD COLUMN "color" text DEFAULT 'slate' NOT NULL;
--> statement-breakpoint
UPDATE "questionnaire_category"
SET "color" = CASE "slug"
  WHEN 'data_request' THEN 'blue'
  WHEN 'hobson_roi' THEN 'violet'
  WHEN 'workshop' THEN 'emerald'
  WHEN 'pre_workshop' THEN 'amber'
  WHEN 'custom' THEN 'slate'
  ELSE 'slate'
END;