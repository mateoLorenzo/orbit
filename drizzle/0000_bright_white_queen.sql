CREATE TYPE "public"."content_status" AS ENUM('generating', 'ready', 'failed', 'stale');--> statement-breakpoint
CREATE TYPE "public"."file_status" AS ENUM('pending', 'processing', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('pdf', 'doc', 'image', 'audio', 'video');--> statement-breakpoint
CREATE TYPE "public"."node_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."preferred_format" AS ENUM('text', 'audio', 'video', 'visual', 'podcast');--> statement-breakpoint
CREATE TYPE "public"."progress_status" AS ENUM('locked', 'available', 'in_progress', 'mastered');--> statement-breakpoint
CREATE TABLE "file_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"text" text NOT NULL,
	"embedding" vector(1024),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"s3_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_type" "file_type" NOT NULL,
	"size_bytes" integer NOT NULL,
	"status" "file_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"summary" text,
	"keywords" text[],
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "node_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_id" uuid NOT NULL,
	"content_type" text DEFAULT 'image' NOT NULL,
	"content_url" text,
	"image_prompt" text,
	"topic_embedding" vector(1024),
	"generation_metadata" jsonb,
	"status" "content_status" DEFAULT 'generating' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "node_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_node_id" uuid NOT NULL,
	"to_node_id" uuid NOT NULL,
	"edge_type" text DEFAULT 'prerequisite',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "node_edges_unique_pair" UNIQUE("from_node_id","to_node_id"),
	CONSTRAINT "node_edges_no_self_loop" CHECK ("node_edges"."from_node_id" <> "node_edges"."to_node_id")
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content_brief" text NOT NULL,
	"topic_embedding" vector(1024),
	"status" "node_status" DEFAULT 'active' NOT NULL,
	"position_x" integer,
	"position_y" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"preferred_format" "preferred_format" DEFAULT 'text' NOT NULL,
	"display_name" text,
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"active_hours" text[] DEFAULT '{}'::text[] NOT NULL,
	"recurring_mistakes" text[] DEFAULT '{}'::text[] NOT NULL,
	"average_friction" integer DEFAULT 50 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"node_id" uuid NOT NULL,
	"status" "progress_status" DEFAULT 'available' NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_user_node_unique" UNIQUE("user_id","node_id")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"last_upload_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "file_chunks" ADD CONSTRAINT "file_chunks_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_chunks" ADD CONSTRAINT "file_chunks_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_content" ADD CONSTRAINT "node_content_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_edges" ADD CONSTRAINT "node_edges_from_node_id_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_edges" ADD CONSTRAINT "node_edges_to_node_id_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_path_id_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."paths"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paths" ADD CONSTRAINT "paths_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_file_chunks_subject" ON "file_chunks" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "idx_file_chunks_file" ON "file_chunks" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_file_chunks_embedding" ON "file_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_files_subject_status" ON "files" USING btree ("subject_id","status");--> statement-breakpoint
CREATE INDEX "idx_files_user" ON "files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_node_content_lookup" ON "node_content" USING btree ("node_id","content_type","status");--> statement-breakpoint
CREATE INDEX "idx_node_content_topic_embedding" ON "node_content" USING hnsw ("topic_embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_node_edges_from" ON "node_edges" USING btree ("from_node_id");--> statement-breakpoint
CREATE INDEX "idx_node_edges_to" ON "node_edges" USING btree ("to_node_id");--> statement-breakpoint
CREATE INDEX "idx_nodes_path" ON "nodes" USING btree ("path_id");--> statement-breakpoint
CREATE INDEX "idx_nodes_subject_status" ON "nodes" USING btree ("subject_id","status");--> statement-breakpoint
CREATE INDEX "idx_nodes_topic_embedding" ON "nodes" USING hnsw ("topic_embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_paths_subject_order" ON "paths" USING btree ("subject_id","order_index");--> statement-breakpoint
CREATE INDEX "idx_progress_user_status" ON "progress" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_progress_node" ON "progress" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "idx_subjects_user" ON "subjects" USING btree ("user_id");