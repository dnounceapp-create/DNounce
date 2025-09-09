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

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  endpointId: uuid('endpoint_id').notNull(),
  event: text('event').notNull(),
  payload: jsonb('payload'),
  statusCode: bigint('status_code', { mode: 'number' }),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
