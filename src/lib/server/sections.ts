import { asc, eq, max } from 'drizzle-orm';
import type { getDb } from './db';
import { SECTION_STATUSES, sections, type Section, type SectionStatus } from './db/schema';

type Db = ReturnType<typeof getDb>;

/** Non-archived sections, in display order. */
export function listActive(db: Db): Promise<Section[]> {
	return db
		.select()
		.from(sections)
		.where(eq(sections.archived, false))
		.orderBy(asc(sections.sortOrder));
}

/** Every section (incl. archived), in display order. */
export function listAll(db: Db): Promise<Section[]> {
	return db.select().from(sections).orderBy(asc(sections.sortOrder));
}

/** Create a section at the end (sortOrder = max incl. archived + 10). */
export async function createSection(db: Db, name: string): Promise<Section> {
	const trimmed = name.trim();
	if (!trimmed) throw new Error('Section name required');
	const rows = await db.select({ max: max(sections.sortOrder) }).from(sections);
	const nextOrder = (rows[0]?.max ?? 0) + 10;
	const inserted = await db
		.insert(sections)
		.values({ name: trimmed, sortOrder: nextOrder })
		.returning();
	return inserted[0];
}

export async function renameSection(db: Db, id: number, name: string): Promise<void> {
	const trimmed = name.trim();
	if (!trimmed) throw new Error('Section name required');
	await db
		.update(sections)
		.set({ name: trimmed, updatedAt: new Date() })
		.where(eq(sections.id, id));
}

export async function setStatus(db: Db, id: number, status: string): Promise<void> {
	if (!(SECTION_STATUSES as readonly string[]).includes(status)) {
		throw new Error(`Invalid section status: ${status}`);
	}
	await db
		.update(sections)
		.set({ status: status as SectionStatus, updatedAt: new Date() })
		.where(eq(sections.id, id));
}

export async function saveNotes(db: Db, id: number, notes: string): Promise<void> {
	await db
		.update(sections)
		.set({ notes: notes ?? '', updatedAt: new Date() })
		.where(eq(sections.id, id));
}

export async function setSectionArchived(db: Db, id: number, archived: boolean): Promise<void> {
	await db.update(sections).set({ archived, updatedAt: new Date() }).where(eq(sections.id, id));
}

/**
 * Move a section one step within the NON-archived ordering by swapping its sortOrder
 * with the adjacent non-archived neighbor. No-op at the ends (or if not found/archived).
 */
export async function moveSection(db: Db, id: number, dir: 'up' | 'down'): Promise<void> {
	const active = await db
		.select()
		.from(sections)
		.where(eq(sections.archived, false))
		.orderBy(asc(sections.sortOrder));
	const idx = active.findIndex((s) => s.id === id);
	if (idx === -1) return;
	const neighborIdx = dir === 'up' ? idx - 1 : idx + 1;
	if (neighborIdx < 0 || neighborIdx >= active.length) return; // at an end — nothing to swap
	const current = active[idx];
	const neighbor = active[neighborIdx];
	const now = new Date();
	await db
		.update(sections)
		.set({ sortOrder: neighbor.sortOrder, updatedAt: now })
		.where(eq(sections.id, current.id));
	await db
		.update(sections)
		.set({ sortOrder: current.sortOrder, updatedAt: now })
		.where(eq(sections.id, neighbor.id));
}
