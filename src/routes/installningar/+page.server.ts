import { fail } from '@sveltejs/kit';
import { formatSEK } from '$lib/money';
import { dbFromPlatform } from '$lib/server/platform';
import {
	ensureSeed,
	getActiveScenarioId,
	getSettings,
	setTotalBudget
} from '$lib/server/scenarios';
import {
	createSection,
	deleteSection,
	listAll,
	moveSection,
	renameSection,
	setSectionArchived
} from '$lib/server/sections';
import {
	createOption,
	deleteOption,
	getOption,
	listAllOptions,
	setOptionArchived,
	updateOption
} from '$lib/server/options';
import { logDecision } from '$lib/server/log';
import type { Option } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

/**
 * Parse an integer form field; null when absent/blank/non-integer. Strips ALL
 * whitespace first (incl. nbsp/narrow-nbsp) — MoneyInput submits sv-SE-grouped
 * amounts like "1 500 000".
 */
function intOf(v: FormDataEntryValue | null): number | null {
	if (typeof v !== 'string') return null;
	const cleaned = v.replace(/\s+/g, '');
	if (cleaned === '') return null;
	const n = Number(cleaned);
	return Number.isInteger(n) ? n : null;
}
function strOf(v: FormDataEntryValue | null): string {
	return typeof v === 'string' ? v : '';
}

export const load: PageServerLoad = async ({ platform }) => {
	const db = dbFromPlatform(platform);
	await ensureSeed(db);
	const [settings, sections, allOptions] = await Promise.all([
		getSettings(db),
		listAll(db),
		listAllOptions(db)
	]);
	const bySection = new Map<number, Option[]>();
	for (const o of allOptions) {
		const arr = bySection.get(o.sectionId);
		if (arr) arr.push(o);
		else bySection.set(o.sectionId, [o]);
	}
	return {
		totalBudget: settings.totalBudget,
		sections: sections.map((s) => ({ ...s, options: bySection.get(s.id) ?? [] }))
	};
};

export const actions: Actions = {
	setBudget: async ({ request, platform, locals }) => {
		const db = dbFromPlatform(platform);
		const form = await request.formData();
		const total = intOf(form.get('total'));
		if (total === null || total < 0) {
			return fail(400, { error: 'Ange en giltig budget (heltal ≥ 0).' });
		}
		await setTotalBudget(db, total);
		await logDecision(db, {
			action: 'set_budget',
			userEmail: locals.userEmail ?? null,
			detail: formatSEK(total)
		});
		return { ok: true };
	},

	addSection: async ({ request, platform, locals }) => {
		const db = dbFromPlatform(platform);
		const form = await request.formData();
		const name = strOf(form.get('name')).trim();
		// Optional fixed cost: creates the section's single option (auto-selected),
		// so a plain cost line needs no separate "add option" step.
		const rawCost = strOf(form.get('cost')).trim();
		const cost = intOf(form.get('cost'));
		if (!name) return fail(400, { error: 'Namnge avsnittet.' });
		if (rawCost !== '' && (cost === null || cost < 0)) {
			return fail(400, { error: 'Ange en giltig kostnad (heltal ≥ 0).' });
		}
		const section = await createSection(db, name);
		await logDecision(db, {
			action: 'add_section',
			userEmail: locals.userEmail ?? null,
			sectionId: section.id,
			detail: section.name
		});
		if (rawCost !== '' && cost !== null) {
			const scenarioId = await getActiveScenarioId(db);
			const { option } = await createOption(db, scenarioId, section.id, {
				name: section.name,
				cost
			});
			await logDecision(db, {
				action: 'add_option',
				userEmail: locals.userEmail ?? null,
				scenarioId,
				sectionId: section.id,
				optionId: option.id,
				detail: `${option.name} (${formatSEK(option.cost)}) — valdes automatiskt`
			});
		}
		return { ok: true };
	},

	renameSection: async ({ request, platform, locals }) => {
		const db = dbFromPlatform(platform);
		const form = await request.formData();
		const sectionId = intOf(form.get('sectionId'));
		const name = strOf(form.get('name')).trim();
		if (sectionId === null || sectionId <= 0) return fail(400, { error: 'Ogiltigt avsnitt.' });
		if (!name) return fail(400, { error: 'Namnge avsnittet.' });
		await renameSection(db, sectionId, name);
		await logDecision(db, {
			action: 'rename_section',
			userEmail: locals.userEmail ?? null,
			sectionId,
			detail: name
		});
		return { ok: true };
	},

	moveSection: async ({ request, platform, locals }) => {
		const db = dbFromPlatform(platform);
		const form = await request.formData();
		const sectionId = intOf(form.get('sectionId'));
		const dir = strOf(form.get('dir'));
		if (sectionId === null || sectionId <= 0) return fail(400, { error: 'Ogiltigt avsnitt.' });
		if (dir !== 'up' && dir !== 'down') return fail(400, { error: 'Ogiltig riktning.' });
		await moveSection(db, sectionId, dir);
		await logDecision(db, {
			action: 'move_section',
			userEmail: locals.userEmail ?? null,
			sectionId,
			detail: dir === 'up' ? 'upp' : 'ner'
		});
		return { ok: true };
	},

	archiveSection: async ({ request, platform, locals }) => {
		const db = dbFromPlatform(platform);
		const form = await request.formData();
		const sectionId = intOf(form.get('sectionId'));
		if (sectionId === null || sectionId <= 0) return fail(400, { error: 'Ogiltigt avsnitt.' });
		await setSectionArchived(db, sectionId, true);
		await logDecision(db, {
			action: 'archive_section',
			userEmail: locals.userEmail ?? null,
			sectionId
		});
		return { ok: true };
	},

	unarchiveSection: async ({ request, platform, locals }) => {
		const db = dbFromPlatform(platform);
		const form = await request.formData();
		const sectionId = intOf(form.get('sectionId'));
		if (sectionId === null || sectionId <= 0) return fail(400, { error: 'Ogiltigt avsnitt.' });
		await setSectionArchived(db, sectionId, false);
		await logDecision(db, {
			action: 'unarchive_section',
			userEmail: locals.userEmail ?? null,
			sectionId
		});
		return { ok: true };
	},

	deleteSection: async ({ request, platform, locals }) => {
		const db = dbFromPlatform(platform);
		const form = await request.formData();
		const sectionId = intOf(form.get('sectionId'));
		if (sectionId === null || sectionId <= 0) return fail(400, { error: 'Ogiltigt avsnitt.' });
		try {
			const section = await deleteSection(db, sectionId);
			await logDecision(db, {
				action: 'delete_section',
				userEmail: locals.userEmail ?? null,
				detail: `${section.name} togs bort permanent (inkl. alternativ)`
			});
		} catch {
			return fail(400, { error: 'Endast arkiverade avsnitt kan tas bort permanent.' });
		}
		return { ok: true };
	},

	addOption: async ({ request, platform, locals }) => {
		const db = dbFromPlatform(platform);
		const scenarioId = await getActiveScenarioId(db);
		const form = await request.formData();
		const sectionId = intOf(form.get('sectionId'));
		const name = strOf(form.get('name')).trim();
		const cost = intOf(form.get('cost'));
		const description = strOf(form.get('description')).trim();
		const url = strOf(form.get('url')).trim();
		if (sectionId === null || sectionId <= 0) return fail(400, { error: 'Ogiltigt avsnitt.' });
		if (!name) return fail(400, { error: 'Namnge alternativet.' });
		if (cost === null || cost < 0)
			return fail(400, { error: 'Ange en giltig kostnad (heltal ≥ 0).' });
		const { option, autoSelected } = await createOption(db, scenarioId, sectionId, {
			name,
			description,
			cost,
			url: url || null
		});
		await logDecision(db, {
			action: 'add_option',
			userEmail: locals.userEmail ?? null,
			scenarioId,
			sectionId,
			optionId: option.id,
			detail: `${option.name} (${formatSEK(option.cost)})${autoSelected ? ' — valdes automatiskt' : ''}`
		});
		return { ok: true };
	},

	editOption: async ({ request, platform, locals }) => {
		const db = dbFromPlatform(platform);
		const form = await request.formData();
		const optionId = intOf(form.get('optionId'));
		const name = strOf(form.get('name')).trim();
		const cost = intOf(form.get('cost'));
		const description = strOf(form.get('description')).trim();
		const url = strOf(form.get('url')).trim();
		if (optionId === null || optionId <= 0) return fail(400, { error: 'Ogiltigt alternativ.' });
		if (!name) return fail(400, { error: 'Namnge alternativet.' });
		if (cost === null || cost < 0)
			return fail(400, { error: 'Ange en giltig kostnad (heltal ≥ 0).' });
		await updateOption(db, optionId, { name, description, cost, url: url || null });
		await logDecision(db, {
			action: 'edit_option',
			userEmail: locals.userEmail ?? null,
			optionId,
			detail: `${name} (${formatSEK(cost)})`
		});
		return { ok: true };
	},

	archiveOption: async ({ request, platform, locals }) => {
		const db = dbFromPlatform(platform);
		const scenarioId = await getActiveScenarioId(db);
		const form = await request.formData();
		const optionId = intOf(form.get('optionId'));
		if (optionId === null || optionId <= 0) return fail(400, { error: 'Ogiltigt alternativ.' });
		const opt = await getOption(db, optionId);
		const outcome = await setOptionArchived(db, scenarioId, optionId, true);
		const outcomeLabel = outcome === 'cleared' ? 'valet rensades' : 'valet oförändrat';
		await logDecision(db, {
			action: 'archive_option',
			userEmail: locals.userEmail ?? null,
			scenarioId,
			sectionId: opt?.sectionId,
			optionId,
			detail: `${opt?.name ?? `#${optionId}`} arkiverat — ${outcomeLabel}`
		});
		return { ok: true };
	},

	deleteOption: async ({ request, platform, locals }) => {
		const db = dbFromPlatform(platform);
		const form = await request.formData();
		const optionId = intOf(form.get('optionId'));
		if (optionId === null || optionId <= 0) return fail(400, { error: 'Ogiltigt alternativ.' });
		const opt = await getOption(db, optionId);
		if (!opt) return fail(400, { error: 'Alternativet finns inte.' });
		if (!opt.archived) {
			return fail(400, { error: 'Endast arkiverade alternativ kan tas bort permanent.' });
		}
		await deleteOption(db, optionId);
		await logDecision(db, {
			action: 'delete_option',
			userEmail: locals.userEmail ?? null,
			sectionId: opt.sectionId,
			detail: `${opt.name} (${formatSEK(opt.cost)}) togs bort permanent`
		});
		return { ok: true };
	},

	unarchiveOption: async ({ request, platform, locals }) => {
		const db = dbFromPlatform(platform);
		const scenarioId = await getActiveScenarioId(db);
		const form = await request.formData();
		const optionId = intOf(form.get('optionId'));
		if (optionId === null || optionId <= 0) return fail(400, { error: 'Ogiltigt alternativ.' });
		const opt = await getOption(db, optionId);
		await setOptionArchived(db, scenarioId, optionId, false);
		await logDecision(db, {
			action: 'unarchive_option',
			userEmail: locals.userEmail ?? null,
			scenarioId,
			sectionId: opt?.sectionId,
			optionId,
			detail: opt?.name
		});
		return { ok: true };
	}
};
