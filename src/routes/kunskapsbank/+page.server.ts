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
	// `query` is echoed straight back into the input (so typing isn't clobbered on a sub-min
	// query navigating to the browse view); `q` (trimmed) drives the search + count line.
	const query = url.searchParams.get('q') ?? '';
	const q = query.trim();

	if (q.length >= MIN_QUERY) {
		return { mode: 'search' as const, query, q, hits: searchKbDocs(docs, q), total, indexedCount };
	}
	return { mode: 'browse' as const, query, groups: groupKbByCategory(docs), total, indexedCount };
};

export const actions: Actions = {
	// Rebuild search_text for every kb doc from its HTML in R2.
	reindex: async ({ platform }) => {
		const indexed = await reindexKbDocs(platform);
		return { indexed };
	}
};
