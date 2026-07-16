import { asc, eq } from 'drizzle-orm';
import type { getDb } from './db';
import { options, sections, selections, type Option, type Section } from './db/schema';
import { getSettings } from './scenarios';

type Db = ReturnType<typeof getDb>;

export interface SummarySection {
	section: Section;
	/** Non-archived options for this section, ordered by sortOrder. */
	options: Option[];
	selectedOptionId: number | null;
	selectedCost: number | null;
}

export interface BudgetSummary {
	totalBudget: number;
	allocated: number;
	remaining: number;
	overBudget: boolean;
	decidedCount: number;
	decidableCount: number;
	sections: SummarySection[];
}

/**
 * Select an option for (scenario, section). Validates that the option belongs to the
 * section and is not archived, then upserts the unique (scenarioId, sectionId) selection.
 */
export async function selectOption(
	db: Db,
	scenarioId: number,
	sectionId: number,
	optionId: number
): Promise<void> {
	const optRows = await db.select().from(options).where(eq(options.id, optionId)).limit(1);
	const opt = optRows[0];
	if (!opt) throw new Error(`Option ${optionId} not found`);
	if (opt.sectionId !== sectionId) {
		throw new Error(`Option ${optionId} does not belong to section ${sectionId}`);
	}
	if (opt.archived) throw new Error(`Option ${optionId} is archived and cannot be selected`);

	await db
		.insert(selections)
		.values({ scenarioId, sectionId, optionId })
		.onConflictDoUpdate({
			target: [selections.scenarioId, selections.sectionId],
			set: { optionId, updatedAt: new Date() }
		});
}

/**
 * The dashboard summary for a scenario. Built from one query per table (sections,
 * options, selections) + settings, joined in JS — no per-section N+1.
 *
 * - `allocated` = Σ selected non-archived option costs over non-archived sections.
 * - `decidableCount` = non-archived sections having ≥1 non-archived option.
 * - `decidedCount` = of those, how many have a (valid, non-archived) selection.
 */
export async function getSummary(db: Db, scenarioId: number): Promise<BudgetSummary> {
	const setting = await getSettings(db);
	const [allSections, allOptions, allSelections] = await Promise.all([
		db.select().from(sections).where(eq(sections.archived, false)).orderBy(asc(sections.sortOrder)),
		db
			.select()
			.from(options)
			.where(eq(options.archived, false))
			.orderBy(asc(options.sortOrder), asc(options.id)),
		db.select().from(selections).where(eq(selections.scenarioId, scenarioId))
	]);

	const optionsBySection = new Map<number, Option[]>();
	const optionById = new Map<number, Option>();
	for (const o of allOptions) {
		optionById.set(o.id, o);
		const arr = optionsBySection.get(o.sectionId);
		if (arr) arr.push(o);
		else optionsBySection.set(o.sectionId, [o]);
	}

	const selectedOptionBySection = new Map<number, number>();
	for (const s of allSelections) selectedOptionBySection.set(s.sectionId, s.optionId);

	let allocated = 0;
	let decidableCount = 0;
	let decidedCount = 0;

	const summarySections: SummarySection[] = allSections.map((section) => {
		const opts = optionsBySection.get(section.id) ?? [];
		const rawSelectedId = selectedOptionBySection.get(section.id);
		// Only honor a selection that still points at a live, non-archived option.
		const selectedOption = rawSelectedId != null ? optionById.get(rawSelectedId) : undefined;
		const selectedOptionId = selectedOption ? selectedOption.id : null;
		const selectedCost = selectedOption ? selectedOption.cost : null;

		if (opts.length > 0) {
			decidableCount++;
			if (selectedOptionId != null) decidedCount++;
		}
		if (selectedCost != null) allocated += selectedCost;

		return { section, options: opts, selectedOptionId, selectedCost };
	});

	const totalBudget = setting.totalBudget;
	const remaining = totalBudget - allocated;

	return {
		totalBudget,
		allocated,
		remaining,
		overBudget: remaining < 0,
		decidedCount,
		decidableCount,
		sections: summarySections
	};
}
