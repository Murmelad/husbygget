import { fail } from '@sveltejs/kit';
import { bucketFromPlatform, dbFromPlatform } from '$lib/server/platform';
import { listActive } from '$lib/server/sections';
import { addFile, createEntry, deleteEntry, listEntries } from '$lib/server/journal';
import type { Actions, PageServerLoad } from './$types';

/** 15 MB per uploaded file. */
const MAX_FILE_BYTES = 15 * 1024 * 1024;

/** Parse an integer form/query value; null when absent/blank/non-integer. */
function intOf(v: string | FormDataEntryValue | null): number | null {
	if (typeof v !== 'string' || v.trim() === '') return null;
	const n = Number(v);
	return Number.isInteger(n) ? n : null;
}

/**
 * Filename for storage/display: drop any path prefix, strip control characters,
 * keep the extension. Falls back to 'fil' if nothing usable remains.
 */
function sanitizeFilename(name: string): string {
	const base = name.split(/[\\/]/).pop() ?? '';
	let out = '';
	for (const ch of base) {
		const code = ch.codePointAt(0) ?? 0;
		if (code >= 32 && code !== 127) out += ch;
	}
	out = out.trim();
	return out || 'fil';
}

export const load: PageServerLoad = async ({ platform, url }) => {
	const db = dbFromPlatform(platform);
	const avsnitt = intOf(url.searchParams.get('avsnitt'));
	const sectionId = avsnitt != null && avsnitt > 0 ? avsnitt : null;
	const [entries, sections] = await Promise.all([
		listEntries(db, sectionId != null ? { sectionId } : {}),
		listActive(db)
	]);
	return { entries, sections, activeSectionId: sectionId };
};

export const actions: Actions = {
	// Create an entry with text and/or file attachments. Multipart form.
	addEntry: async ({ request, platform, locals }) => {
		const db = dbFromPlatform(platform);
		const bucket = bucketFromPlatform(platform);
		const form = await request.formData();

		const bodyRaw = form.get('body');
		const body = typeof bodyRaw === 'string' ? bodyRaw.trim() : '';
		const sectionId = intOf(form.get('sectionId'));
		const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);

		if (body === '' && files.length === 0) {
			return fail(400, { error: 'Skriv något eller bifoga minst en fil.' });
		}
		for (const f of files) {
			if (f.size > MAX_FILE_BYTES) {
				return fail(400, { error: `Filen "${f.name}" är för stor (max 15 MB).` });
			}
		}

		const entry = await createEntry(db, {
			sectionId: sectionId != null && sectionId > 0 ? sectionId : null,
			body,
			userEmail: locals.userEmail ?? null
		});

		for (const f of files) {
			const safeName = sanitizeFilename(f.name);
			const contentType = f.type || 'application/octet-stream';
			const key = `entry/${entry.id}/${crypto.randomUUID()}/${safeName}`;
			// Pass the File (a Blob) directly: R2 needs a known length, which a raw
			// `file.stream()` lacks (it rejects with "must have a known length").
			await bucket.put(key, f, { httpMetadata: { contentType } });
			await addFile(db, {
				entryId: entry.id,
				r2Key: key,
				name: safeName,
				contentType,
				size: f.size
			});
		}

		return { ok: true };
	},

	// Remove an entry, its file rows, and the underlying R2 objects.
	deleteEntry: async ({ request, platform }) => {
		const db = dbFromPlatform(platform);
		const bucket = bucketFromPlatform(platform);
		const form = await request.formData();
		const entryId = intOf(form.get('entryId'));
		if (entryId === null || entryId <= 0) return fail(400, { error: 'Ogiltig anteckning.' });

		const files = await deleteEntry(db, entryId);
		for (const f of files) {
			try {
				await bucket.delete(f.r2Key);
			} catch (err) {
				// R2 is cleaned up after D1 — tolerate a stray object failing to delete.
				console.error('R2 delete failed (ignored):', f.r2Key, err);
			}
		}
		return { ok: true };
	}
};
