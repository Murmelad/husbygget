import { dbFromPlatform } from '$lib/server/platform';
import { groupKbByCategory, listKbDocs, reindexKbDocs, searchKbDocs } from '$lib/server/kb';
import type { Actions, PageServerLoad } from './$types';

/** Minimum query length before we run a search (below this = browse view). */
const MIN_QUERY = 2;

export const load: PageServerLoad = async ({ platform, url }) => {
	const db = dbFromPlatform(platform);
	const docs = await listKbDocs(db);
	const indexedCount = docs.filter((d) => d.searchText != null && d.searchText !== '').length;
	const total = docs.length;
	const q = (url.searchParams.get('q') ?? '').trim();

	if (q.length >= MIN_QUERY) {
		return { mode: 'search' as const, q, hits: searchKbDocs(docs, q), total, indexedCount };
	}
	return { mode: 'browse' as const, q: '', groups: groupKbByCategory(docs), total, indexedCount };
};

export const actions: Actions = {
	// Rebuild search_text for every kb doc from its HTML in R2.
	reindex: async ({ platform }) => {
		const indexed = await reindexKbDocs(platform);
		return { indexed };
	}
};
