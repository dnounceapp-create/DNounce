import {
  pgTable, text, timestamp, uuid, boolean, jsonb, primaryKey, bigint, bigserial,
} from 'drizzle-orm/pg-core';

/** PROFILES */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/** SUBJECTS (formerly defendants) */
export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/** SUBJECT ORGANIZATIONS */
export const subject_organizations = pgTable(
  'subject_organizations',
  {
    subjectId: uuid('subject_id').notNull(),
    organizationId: uuid('organization_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.subjectId, t.organizationId] }) }),
);

/** SUBJECT CATEGORIES */
export const subject_categories = pgTable(
  'subject_categories',
  {
    subjectId: uuid('subject_id').notNull(),
    categoryId: uuid('category_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.subjectId, t.categoryId] }) }),
);

/** SUBJECT RELATIONSHIPS */
export const subject_relationships = pgTable(
  'subject_relationships',
  {
    subjectId: uuid('subject_id').notNull(),
    relationshipTypeId: uuid('relationship_type_id').notNull(),
    customValue: text('custom_value'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.subjectId, t.relationshipTypeId] }) }),
);

/** SUBJECT STATES */
export const subject_states = pgTable(
  'subject_states',
  {
    subjectId: uuid('subject_id').notNull(),
    stateId: uuid('state_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.subjectId, t.stateId] }) }),
);

/** SUBJECT LOCATIONS */
export const subject_locations = pgTable(
  'subject_locations',
  {
    subjectId: uuid('subject_id').notNull(),
    locationId: uuid('location_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.subjectId, t.locationId] }) }),
);

/** RECORDS (formerly cases) */
export const records = pgTable('records', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectId: uuid('subject_id').notNull(),
  contributorId: uuid('contributor_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  classification: text('classification').notNull(), // evidence-based or opinion-based
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/** RECORD EVIDENCE */
export const record_evidence = pgTable('record_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  recordId: uuid('record_id').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(),
  description: text('description'),
  uploadedBy: uuid('uploaded_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** RECORD RESPONSES */
export const record_responses = pgTable('record_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  recordId: uuid('record_id').notNull(),
  subjectId: uuid('subject_id').notNull(),
  responseText: text('response_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** COMMUNITY REVIEWS (formerly voting) */
export const community_reviews = pgTable('community_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  recordId: uuid('record_id').notNull(),
  reviewerId: uuid('reviewer_id').notNull(),
  decision: text('decision').notNull(), // keep or delete
  explanation: text('explanation'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** ORGANIZATIONS */
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** CATEGORIES */
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** RELATIONSHIP TYPES */
export const relationship_types = pgTable('relationship_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  value: text('value').notNull(),
  label: text('label').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** STATES */
export const states = pgTable('states', {
  id: uuid('id').primaryKey().defaultRandom(),
  state_abbreviation: text('state_abbreviation').notNull(),
  full_state_name: text('full_state_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** LOCATIONS */
export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** REPUTATIONS */
export const reputations = pgTable('reputations', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectId: uuid('subject_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** BADGES */
export const badges = pgTable('badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectId: uuid('subject_id').notNull(),
  label: text('label').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** ORGS */
export const orgs = pgTable('orgs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/** ORG MEMBERS */
export const orgMembers = pgTable(
  'org_members',
  {
    orgId: uuid('org_id').notNull(),
    userId: uuid('user_id').notNull(),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.orgId, t.userId] }) }),
);

/** PROJECTS */
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  status: text('status').notNull().default('active'),
});

/** AUDIT LOGS */
export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  orgId: uuid('org_id').notNull(),
  actorId: uuid('actor_id'),
  action: text('action').notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** WEBHOOKS */
export const webhookEndpoints = pgTable('webhook_endpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  url: text('url').notNull(),
  description: text('description'),
  secret: text('secret').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const webhookDeliveries = pgTable('webhookDeliveries', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  endpointId: uuid('endpoint_id').notNull(),
  event: text('event').notNull(),
  payload: jsonb('payload'),
  statusCode: bigint('status_code', { mode: 'number' }),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});