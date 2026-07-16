import { eq } from 'drizzle-orm';
import type { getDb } from './db';
import { scenarios, settings, type Settings } from './db/schema';

type Db = ReturnType<typeof getDb>;

/** The single seeded scenario + settings row ids (v1 runs one scenario, 'Plan'). */
export const SEED_SCENARIO_ID = 1;
export const SETTINGS_ID = 1;

/**
 * Idempotent bootstrap: ensure scenario 1 ('Plan') and the settings singleton (id 1)
 * exist. Safe to call on every request path that needs them; conflicts are ignored.
 * (The initial seed migration also inserts these, so this mainly covers fresh/empty DBs.)
 */
export async function ensureSeed(db: Db): Promise<void> {
	await db.insert(scenarios).values({ id: SEED_SCENARIO_ID, name: 'Plan' }).onConflictDoNothing();
	await db
		.insert(settings)
		.values({ id: SETTINGS_ID, totalBudget: 0, activeScenarioId: SEED_SCENARIO_ID })
		.onConflictDoNothing();
}

/** Read the settings singleton, seeding it first if the row is missing. */
export async function getSettings(db: Db): Promise<Settings> {
	let rows = await db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).limit(1);
	if (rows.length === 0) {
		await ensureSeed(db);
		rows = await db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).limit(1);
	}
	const row = rows[0];
	if (!row) throw new Error('settings row missing after seed');
	return row;
}

/** The active scenario id (seeds settings if absent). */
export async function getActiveScenarioId(db: Db): Promise<number> {
	const s = await getSettings(db);
	return s.activeScenarioId;
}

/** Set the global total budget (whole SEK, ≥ 0). Bumps updatedAt. */
export async function setTotalBudget(db: Db, totalBudget: number): Promise<void> {
	if (!Number.isInteger(totalBudget) || totalBudget < 0) {
		throw new Error(`Invalid total budget: ${totalBudget} (whole SEK ≥ 0 required)`);
	}
	await ensureSeed(db);
	await db
		.update(settings)
		.set({ totalBudget, updatedAt: new Date() })
		.where(eq(settings.id, SETTINGS_ID));
}
