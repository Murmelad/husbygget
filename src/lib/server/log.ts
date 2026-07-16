import { desc } from 'drizzle-orm';
import type { getDb } from './db';
import { decisionLog, type DecisionLogEntry } from './db/schema';

type Db = ReturnType<typeof getDb>;

export interface LogEntryInput {
	action: string;
	userEmail?: string | null;
	scenarioId?: number;
	sectionId?: number;
	optionId?: number;
	detail?: string;
}

/**
 * Append an audit entry. A failed log must never break the mutation it accompanies,
 * so any error is swallowed (logged to the console only).
 */
export async function logDecision(db: Db, entry: LogEntryInput): Promise<void> {
	try {
		await db.insert(decisionLog).values({
			action: entry.action,
			userEmail: entry.userEmail ?? null,
			scenarioId: entry.scenarioId ?? null,
			sectionId: entry.sectionId ?? null,
			optionId: entry.optionId ?? null,
			detail: entry.detail ?? null
		});
	} catch (err) {
		console.error('logDecision failed (ignored):', err);
	}
}

/** Recent audit entries, newest first. */
export function listRecent(db: Db, limit = 50): Promise<DecisionLogEntry[]> {
	return db.select().from(decisionLog).orderBy(desc(decisionLog.createdAt)).limit(limit);
}
