import { fail } from '@sveltejs/kit';
import { formatSEK } from '$lib/money';
import { isSectionStatus, STATUS_LABELS } from '$lib/status';
import { dbFromPlatform } from '$lib/server/platform';
import { ensureSeed, getActiveScenarioId } from '$lib/server/scenarios';
import { getSummary, selectOption } from '$lib/server/budget';
import { getOption } from '$lib/server/options';
import { saveNotes, setStatus } from '$lib/server/sections';
import { logDecision } from '$lib/server/log';
import type { Actions, PageServerLoad } from './$types';

/** Parse an integer form field; null when absent/blank/non-integer. */
function intOf(v: FormDataEntryValue | null): number | null {
	if (typeof v !== 'string' || v.trim() === '') return null;
	const n = Number(v);
	return Number.isInteger(n) ? n : null;
}

export const load: PageServerLoad = async ({ platform }) => {
	const db = dbFromPlatform(platform);
	await ensureSeed(db);
	const scenarioId = await getActiveScenarioId(db);
	return { summary: await getSummary(db, scenarioId) };
};

export const actions: Actions = {
	// Swap the selected option for a section's decision.
	selectOption: async ({ request, platform, locals }) => {
		const db = dbFromPlatform(platform);
		const scenarioId = await getActiveScenarioId(db);
		const form = await request.formData();
		const sectionId = intOf(form.get('sectionId'));
		const optionId = intOf(form.get('optionId'));
		if (sectionId === null || sectionId <= 0 || optionId === null || optionId <= 0) {
			return fail(400, { error: 'Ogiltigt avsnitt eller alternativ.' });
		}
		try {
			await selectOption(db, scenarioId, sectionId, optionId);
		} catch (e) {
			return fail(400, {
				error: e instanceof Error ? e.message : 'Kunde inte välja alternativet.'
			});
		}
		const opt = await getOption(db, optionId);
		await logDecision(db, {
			action: 'select_option',
			userEmail: locals.userEmail ?? null,
			scenarioId,
			sectionId,
			optionId,
			detail: opt ? `${opt.name} (${formatSEK(opt.cost)})` : undefined
		});
		return { ok: true };
	},

	// Change a section's build status (ej_paborjad / pagar / klar).
	setStatus: async ({ request, platform, locals }) => {
		const db = dbFromPlatform(platform);
		const scenarioId = await getActiveScenarioId(db);
		const form = await request.formData();
		const sectionId = intOf(form.get('sectionId'));
		const status = form.get('status');
		if (sectionId === null || sectionId <= 0) return fail(400, { error: 'Ogiltigt avsnitt.' });
		if (typeof status !== 'string' || !isSectionStatus(status)) {
			return fail(400, { error: 'Ogiltig status.' });
		}
		try {
			await setStatus(db, sectionId, status);
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Kunde inte ändra status.' });
		}
		await logDecision(db, {
			action: 'set_status',
			userEmail: locals.userEmail ?? null,
			scenarioId,
			sectionId,
			detail: STATUS_LABELS[status]
		});
		return { ok: true };
	},

	// Save free-text notes for a section (no audit log).
	saveNotes: async ({ request, platform }) => {
		const db = dbFromPlatform(platform);
		const form = await request.formData();
		const sectionId = intOf(form.get('sectionId'));
		const notes = form.get('notes');
		if (sectionId === null || sectionId <= 0) return fail(400, { error: 'Ogiltigt avsnitt.' });
		await saveNotes(db, sectionId, typeof notes === 'string' ? notes : '');
		return { ok: true };
	}
};
