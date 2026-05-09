import {
  pgTable,
  pgEnum,
  pgSchema,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  vector,
  unique,
  check,
  index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

const authSchema = pgSchema('auth')
const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
})

export const fileStatus = pgEnum('file_status', ['pending', 'processing', 'processed', 'failed'])
export const fileType = pgEnum('file_type', ['pdf', 'doc', 'image', 'audio', 'video'])
export const nodeStatus = pgEnum('node_status', ['active', 'archived'])
export const contentStatus = pgEnum('content_status', ['generating', 'ready', 'failed', 'stale'])

export const progressStatus = pgEnum('progress_status', [
  'locked',
  'available',
  'in_progress',
  'mastered',
])

export const preferredFormat = pgEnum('preferred_format', [
  'text',
  'audio',
  'video',
  'visual',
  'podcast',
])

export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    lastUploadAt: timestamp('last_upload_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_subjects_user').on(t.userId)],
)

export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    s3Key: text('s3_key').notNull(),
    originalFilename: text('original_filename').notNull(),
    mimeType: text('mime_type').notNull(),
    fileType: fileType('file_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    status: fileStatus('status').notNull().default('pending'),
    errorMessage: text('error_message'),
    summary: text('summary'),
    keywords: text('keywords').array(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_files_subject_status').on(t.subjectId, t.status),
    index('idx_files_user').on(t.userId),
  ],
)

export const fileChunks = pgTable(
  'file_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fileId: uuid('file_id')
      .notNull()
      .references(() => files.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    text: text('text').notNull(),
    embedding: vector('embedding', { dimensions: 1024 }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_file_chunks_subject').on(t.subjectId),
    index('idx_file_chunks_file').on(t.fileId),
    index('idx_file_chunks_embedding').using('hnsw', t.embedding.op('vector_cosine_ops')),
  ],
)

export const paths = pgTable(
  'paths',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_paths_subject_order').on(t.subjectId, t.orderIndex)],
)

export const nodes = pgTable(
  'nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pathId: uuid('path_id')
      .notNull()
      .references(() => paths.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    contentBrief: text('content_brief').notNull(),
    topicEmbedding: vector('topic_embedding', { dimensions: 1024 }),
    status: nodeStatus('status').notNull().default('active'),
    positionX: integer('position_x'),
    positionY: integer('position_y'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_nodes_path').on(t.pathId),
    index('idx_nodes_subject_status').on(t.subjectId, t.status),
    index('idx_nodes_topic_embedding').using('hnsw', t.topicEmbedding.op('vector_cosine_ops')),
  ],
)

export const nodeEdges = pgTable(
  'node_edges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromNodeId: uuid('from_node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    toNodeId: uuid('to_node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    edgeType: text('edge_type').default('prerequisite'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_node_edges_from').on(t.fromNodeId),
    index('idx_node_edges_to').on(t.toNodeId),
    unique('node_edges_unique_pair').on(t.fromNodeId, t.toNodeId),
    check('node_edges_no_self_loop', sql`${t.fromNodeId} <> ${t.toNodeId}`),
  ],
)

export const nodeContent = pgTable(
  'node_content',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nodeId: uuid('node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    contentType: text('content_type').notNull().default('image'),
    contentUrl: text('content_url'),
    imagePrompt: text('image_prompt'),
    topicEmbedding: vector('topic_embedding', { dimensions: 1024 }),
    generationMetadata: jsonb('generation_metadata'),
    status: contentStatus('status').notNull().default('generating'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_node_content_lookup').on(t.nodeId, t.contentType, t.status),
    index('idx_node_content_topic_embedding').using(
      'hnsw',
      t.topicEmbedding.op('vector_cosine_ops'),
    ),
  ],
)

export const progress = pgTable(
  'progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    nodeId: uuid('node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    status: progressStatus('status').notNull().default('available'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('progress_user_node_unique').on(t.userId, t.nodeId),
    index('idx_progress_user_status').on(t.userId, t.status),
    index('idx_progress_node').on(t.nodeId),
  ],
)

export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  preferredFormat: preferredFormat('preferred_format').notNull().default('text'),
  displayName: text('display_name'),
  interests: text('interests').array().notNull().default(sql`'{}'::text[]`),
  activeHours: text('active_hours').array().notNull().default(sql`'{}'::text[]`),
  recurringMistakes: text('recurring_mistakes')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  averageFriction: integer('average_friction').notNull().default(50),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Subject = typeof subjects.$inferSelect
export type NewSubject = typeof subjects.$inferInsert
export type FileRow = typeof files.$inferSelect
export type NewFileRow = typeof files.$inferInsert
export type FileChunk = typeof fileChunks.$inferSelect
export type NewFileChunk = typeof fileChunks.$inferInsert
export type Path = typeof paths.$inferSelect
export type Node = typeof nodes.$inferSelect
export type NodeEdge = typeof nodeEdges.$inferSelect
export type NodeContent = typeof nodeContent.$inferSelect
export type Progress = typeof progress.$inferSelect
export type NewProgress = typeof progress.$inferInsert
export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
