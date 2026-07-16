import { and, asc, eq, max } from 'drizzle-orm';
import type { getDb } from './db';
import { options, selections, type Option } from './db/schema';

type Db = ReturnType<typeof getDb>;

export interface OptionInput {
	name: string;
	description?: string;
	cost: number;
	url?: string | null;
}

/** Validate a whole-SEK cost (≥ 0). */
function normalizeCost(cost: number): number {
	if (!Number.isInteger(cost) || cost < 0) {
		throw new Error(`Invalid cost: ${cost} (whole SEK ≥ 0 required)`);
	}
	return cost;
}

/**
 * Create an option in a section (sortOrder = max within section + 10).
 *
 * AUTO-SELECT: if the section has no selection yet for this scenario, the new option
 * is selected immediately (so a freshly added first option is the active choice).
 * Returns the created option and whether it was auto-selected.
 */
export async function createOption(
	db: Db,
	scenarioId: number,
	sectionId: number,
	data: OptionInput
): Promise<{ option: Option; autoSelected: boolean }> {
	const name = data.name.trim();
	if (!name) throw new Error('Option name required');
	const cost = normalizeCost(data.cost);

	const orderRows = await db
		.select({ max: max(options.sortOrder) })
		.from(options)
		.where(eq(options.sectionId, sectionId));
	const nextOrder = (orderRows[0]?.max ?? 0) + 10;

	const inserted = await db
		.insert(options)
		.values({
			sectionId,
			name,
			description: data.description?.trim() ?? '',
			cost,
			url: data.url?.trim() || null,
			sortOrder: nextOrder
		})
		.returning();
	const option = inserted[0];

	const existing = await db
		.select()
		.from(selections)
		.where(and(eq(selections.scenarioId, scenarioId), eq(selections.sectionId, sectionId)))
		.limit(1);
	let autoSelected = false;
	if (existing.length === 0) {
		await db.insert(selections).values({ scenarioId, sectionId, optionId: option.id });
		autoSelected = true;
	}

	return { option, autoSelected };
}

/** Every option (incl. archived), ordered by section then display order — for admin listing. */
export function listAllOptions(db: Db): Promise<Option[]> {
	return db
		.select()
		.from(options)
		.orderBy(asc(options.sectionId), asc(options.sortOrder), asc(options.id));
}

/** A single option by id, or undefined (read helper for building log details). */
export async function getOption(db: Db, id: number): Promise<Option | undefined> {
	const rows = await db.select().from(options).where(eq(options.id, id)).limit(1);
	return rows[0];
}

/** Update an option's editable fields (name / description / cost / url). */
export async function updateOption(db: Db, id: number, data: OptionInput): Promise<void> {
	const name = data.name.trim();
	if (!name) throw new Error('Option name required');
	await db
		.update(options)
		.set({
			name,
			description: data.description?.trim() ?? '',
			cost: normalizeCost(data.cost),
			url: data.url?.trim() || null
		})
		.where(eq(options.id, id));
}

/**
 * Archive / unarchive an option. When archiving the option that is currently selected
 * for this scenario, reselect the cheapest remaining non-archived option in the section,
 * or clear the selection if none remain.
 *
 * Returns what happened to the selection: `'reselected'`, `'cleared'`, or `'none'`.
 */
export async function setOptionArchived(
	db: Db,
	scenarioId: number,
	id: number,
	archived: boolean
): Promise<'reselected' | 'cleared' | 'none'> {
	const optRows = await db.select().from(options).where(eq(options.id, id)).limit(1);
	const opt = optRows[0];
	if (!opt) throw new Error(`Option ${id} not found`);

	await db.update(options).set({ archived }).where(eq(options.id, id));

	// Unarchiving never disturbs an existing selection.
	if (!archived) return 'none';

	const selRows = await db
		.select()
		.from(selections)
		.where(and(eq(selections.scenarioId, scenarioId), eq(selections.sectionId, opt.sectionId)))
		.limit(1);
	const sel = selRows[0];
	if (!sel || sel.optionId !== id) return 'none';

	// The just-archived option is excluded here (archived = true), so this is the
	// cheapest of the *remaining* choices; ties break by sortOrder then id.
	const remaining = await db
		.select()
		.from(options)
		.where(and(eq(options.sectionId, opt.sectionId), eq(options.archived, false)))
		.orderBy(asc(options.cost), asc(options.sortOrder), asc(options.id));
	const cheapest = remaining[0];
	if (cheapest) {
		await db
			.update(selections)
			.set({ optionId: cheapest.id, updatedAt: new Date() })
			.where(eq(selections.id, sel.id));
		return 'reselected';
	}

	await db.delete(selections).where(eq(selections.id, sel.id));
	return 'cleared';
}
