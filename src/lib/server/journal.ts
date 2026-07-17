import { asc, count, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import type { getDb } from './db';
import { journalEntries, journalFiles, type JournalEntry, type JournalFile } from './db/schema';

type Db = ReturnType<typeof getDb>;

/** An entry plus its attachments, oldest attachment first. */
export interface EntryWithFiles {
	entry: JournalEntry;
	files: JournalFile[];
}

/**
 * Journal entries newest-first (optionally filtered to one section), each with its
 * files. Two queries total (entries, then all their files) joined in JS — no N+1.
 */
export async function listEntries(
	db: Db,
	opts: { sectionId?: number } = {}
): Promise<EntryWithFiles[]> {
	const entries = await db
		.select()
		.from(journalEntries)
		.where(opts.sectionId != null ? eq(journalEntries.sectionId, opts.sectionId) : undefined)
		.orderBy(desc(journalEntries.createdAt), desc(journalEntries.id));

	if (entries.length === 0) return [];

	const files = await db
		.select()
		.from(journalFiles)
		.where(
			inArray(
				journalFiles.entryId,
				entries.map((e) => e.id)
			)
		)
		.orderBy(asc(journalFiles.id));

	const filesByEntry = new Map<number, JournalFile[]>();
	for (const f of files) {
		const arr = filesByEntry.get(f.entryId);
		if (arr) arr.push(f);
		else filesByEntry.set(f.entryId, [f]);
	}

	return entries.map((entry) => ({ entry, files: filesByEntry.get(entry.id) ?? [] }));
}

/** Create a journal entry. `sectionId` null = not linked to any section. */
export async function createEntry(
	db: Db,
	input: { sectionId: number | null; body: string; userEmail: string | null }
): Promise<JournalEntry> {
	const inserted = await db
		.insert(journalEntries)
		.values({
			sectionId: input.sectionId,
			body: input.body,
			userEmail: input.userEmail
		})
		.returning();
	return inserted[0];
}

/** Attach a stored-file record to an entry (the R2 object is written by the caller). */
export async function addFile(
	db: Db,
	input: { entryId: number; r2Key: string; name: string; contentType: string; size: number }
): Promise<JournalFile> {
	const inserted = await db.insert(journalFiles).values(input).returning();
	return inserted[0];
}

/** A single file record by id, or undefined if it doesn't exist. */
export async function getFile(db: Db, id: number): Promise<JournalFile | undefined> {
	const rows = await db.select().from(journalFiles).where(eq(journalFiles.id, id)).limit(1);
	return rows[0];
}

/**
 * Delete an entry and its file records. Returns the deleted file rows so the caller
 * can drop the matching R2 objects (D1 cleanup first, then R2).
 */
export async function deleteEntry(db: Db, id: number): Promise<JournalFile[]> {
	const files = await db.select().from(journalFiles).where(eq(journalFiles.entryId, id));
	await db.delete(journalFiles).where(eq(journalFiles.entryId, id));
	await db.delete(journalEntries).where(eq(journalEntries.id, id));
	return files;
}

/**
 * Per-section entry/file counts (only sections that have entries). Two grouped
 * queries (entries by section, files by section), merged in JS.
 */
export async function countBySection(
	db: Db
): Promise<Array<{ sectionId: number; entries: number; files: number }>> {
	const [entryRows, fileRows] = await Promise.all([
		db
			.select({ sectionId: journalEntries.sectionId, entries: count(journalEntries.id) })
			.from(journalEntries)
			.where(isNotNull(journalEntries.sectionId))
			.groupBy(journalEntries.sectionId),
		db
			.select({ sectionId: journalEntries.sectionId, files: count(journalFiles.id) })
			.from(journalFiles)
			.innerJoin(journalEntries, eq(journalFiles.entryId, journalEntries.id))
			.where(isNotNull(journalEntries.sectionId))
			.groupBy(journalEntries.sectionId)
	]);

	const filesBySection = new Map<number, number>();
	for (const r of fileRows) {
		if (r.sectionId != null) filesBySection.set(r.sectionId, r.files);
	}

	const out: Array<{ sectionId: number; entries: number; files: number }> = [];
	for (const r of entryRows) {
		if (r.sectionId == null) continue;
		out.push({
			sectionId: r.sectionId,
			entries: r.entries,
			files: filesBySection.get(r.sectionId) ?? 0
		});
	}
	return out;
}
