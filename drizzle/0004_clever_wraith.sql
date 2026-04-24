CREATE TABLE "questionnaire_category" (
	"slug" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "questionnaire_category" ("slug", "label", "is_system", "sort_order") VALUES
  ('data_request', 'Data Request (Adhoc)', true, 0),
  ('hobson_roi', 'Hobson ROI', true, 1),
  ('workshop', 'Workshop', true, 2),
  ('pre_workshop', 'Pre-Workshop', true, 3),
  ('custom', 'Custom Questionnaire', true, 4);
--> statement-breakpoint
ALTER TABLE "questionnaire" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "questionnaire_template" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "questionnaire" ADD CONSTRAINT "questionnaire_type_questionnaire_category_slug_fk" FOREIGN KEY ("type") REFERENCES "public"."questionnaire_category"("slug") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_template" ADD CONSTRAINT "questionnaire_template_type_questionnaire_category_slug_fk" FOREIGN KEY ("type") REFERENCES "public"."questionnaire_category"("slug") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
DROP TYPE "public"."questionnaire_type";