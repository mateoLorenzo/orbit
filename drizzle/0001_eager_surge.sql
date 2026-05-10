ALTER TABLE "nodes" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_slug_per_subject_unique" UNIQUE("subject_id","slug");--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_slug_unique" UNIQUE("slug");