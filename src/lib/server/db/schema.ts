// Husbygget database schema — Drizzle (sqlite-core) over Cloudflare D1.
//
// Domain: a Swedish house-build planner. Ordered build *sections* (Tomt, Bygglov,
// Tak…); a section optionally carries cost *options* (0 = pure task, 1 = fixed cost,
// ≥2 = a swappable decision). Exactly one option is *selected* per section per
// *scenario*. A global total budget vs. the sum of selected costs drives the dashboard.
// v1 runs a single seeded scenario ('Plan'); the schema is already scenario-ready.
//
// Conventions: integer autoincrement PKs, `timestamp_ms` timestamps defaulted in JS,
// `boolean`-mode integers, and whole-SEK integer costs (no decimals).

import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// Shared column helpers
// ---------------------------------------------------------------------------

/** Autoincrement integer primary key. */
const pk = () => integer('id').primaryKey({ autoIncrement: true });

const createdAt = () =>
	integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date());

const updatedAt = () =>
	integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date());

// ---------------------------------------------------------------------------
// Section status — single source in $lib/status (shared with components/labels);
// re-exported here so server modules can keep importing from the schema.
// ---------------------------------------------------------------------------

import type { SectionStatus } from '$lib/status';
export { SECTION_STATUSES } from '$lib/status';
export type { SectionStatus };

// ---------------------------------------------------------------------------
// Scenarios — a full set of selections. v1 seeds exactly one ('Plan').
// ---------------------------------------------------------------------------

export const scenarios = sqliteTable(
	'scenarios',
	{
		id: pk(),
		name: text('name').notNull(),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('scenarios_name_idx').on(t.name)]
);

// ---------------------------------------------------------------------------
// Settings — a single row (id = 1) holding the global budget + active scenario.
// ---------------------------------------------------------------------------

export const settings = sqliteTable('settings', {
	// Always 1 — a plain (non-autoincrement) PK so the singleton row is explicit.
	id: integer('id').primaryKey(),
	totalBudget: integer('total_budget').notNull().default(0),
	activeScenarioId: integer('active_scenario_id')
		.notNull()
		.references(() => scenarios.id),
	updatedAt: updatedAt()
});

// ---------------------------------------------------------------------------
// Sections — the ordered build steps. sortOrder is sparse (10, 20, 30…) so
// reordering can swap two values without renumbering the whole list.
// ---------------------------------------------------------------------------

export const sections = sqliteTable(
	'sections',
	{
		id: pk(),
		name: text('name').notNull(),
		sortOrder: integer('sort_order').notNull(),
		status: text('status').$type<SectionStatus>().notNull().default('ej_paborjad'),
		notes: text('notes').notNull().default(''),
		archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('sections_sort_order_idx').on(t.sortOrder)]
);

// ---------------------------------------------------------------------------
// Options — cost choices belonging to a section.
// ---------------------------------------------------------------------------

export const options = sqliteTable(
	'options',
	{
		id: pk(),
		sectionId: integer('section_id')
			.notNull()
			.references(() => sections.id),
		name: text('name').notNull(),
		description: text('description').notNull().default(''),
		cost: integer('cost').notNull().default(0),
		url: text('url'),
		sortOrder: integer('sort_order').notNull().default(0),
		archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
		createdAt: createdAt()
	},
	(t) => [index('options_section_id_idx').on(t.sectionId)]
);

// ---------------------------------------------------------------------------
// Selections — the one chosen option per (scenario, section).
// ---------------------------------------------------------------------------

export const selections = sqliteTable(
	'selections',
	{
		id: pk(),
		scenarioId: integer('scenario_id')
			.notNull()
			.references(() => scenarios.id),
		sectionId: integer('section_id')
			.notNull()
			.references(() => sections.id),
		optionId: integer('option_id')
			.notNull()
			.references(() => options.id),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('selections_scenario_section_idx').on(t.scenarioId, t.sectionId)]
);

// ---------------------------------------------------------------------------
// Decision log — an append-only audit trail. FKs are nullable so a log row
// survives the deletion of what it references.
// ---------------------------------------------------------------------------

export const decisionLog = sqliteTable(
	'decision_log',
	{
		id: pk(),
		scenarioId: integer('scenario_id').references(() => scenarios.id),
		sectionId: integer('section_id').references(() => sections.id),
		optionId: integer('option_id').references(() => options.id),
		userEmail: text('user_email'),
		action: text('action').notNull(),
		detail: text('detail'),
		createdAt: createdAt()
	},
	(t) => [index('decision_log_created_at_idx').on(t.createdAt)]
);

// ---------------------------------------------------------------------------
// Journal (Dagbok) — build-diary entries with optional file attachments. An entry
// carries free text and/or files and may be linked to a section (nullable FK, so an
// entry survives a section it once referenced being removed). Files live in R2; only
// the metadata + object key is stored here.
// ---------------------------------------------------------------------------

export const journalEntries = sqliteTable(
	'journal_entries',
	{
		id: pk(),
		sectionId: integer('section_id').references(() => sections.id),
		body: text('body').notNull().default(''),
		userEmail: text('user_email'),
		createdAt: createdAt()
	},
	(t) => [
		index('journal_entries_section_id_idx').on(t.sectionId),
		index('journal_entries_created_at_idx').on(t.createdAt)
	]
);

export const journalFiles = sqliteTable(
	'journal_files',
	{
		id: pk(),
		entryId: integer('entry_id')
			.notNull()
			.references(() => journalEntries.id),
		r2Key: text('r2_key').notNull(),
		name: text('name').notNull(),
		contentType: text('content_type').notNull().default('application/octet-stream'),
		size: integer('size').notNull().default(0),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('journal_files_r2_key_idx').on(t.r2Key),
		index('journal_files_entry_id_idx').on(t.entryId)
	]
);

// ---------------------------------------------------------------------------
// Inferred row types
// ---------------------------------------------------------------------------

export type Scenario = typeof scenarios.$inferSelect;
export type NewScenario = typeof scenarios.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;
export type Option = typeof options.$inferSelect;
export type NewOption = typeof options.$inferInsert;
export type Selection = typeof selections.$inferSelect;
export type NewSelection = typeof selections.$inferInsert;
export type DecisionLogEntry = typeof decisionLog.$inferSelect;
export type NewDecisionLogEntry = typeof decisionLog.$inferInsert;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
export type JournalFile = typeof journalFiles.$inferSelect;
export type NewJournalFile = typeof journalFiles.$inferInsert;
