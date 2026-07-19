// Client-safe Kunskapsbank types + pure helpers. The server-only DB/R2 logic (queries,
// reindex, HTML stripping, search) lives in `$lib/server/kb.ts` and reuses these types.

/** A kb doc without its (large) search text — the shape sent to the browser. */
export interface KbDocView {
	entryId: number;
	title: string;
	category: string;
	version: string | null;
	updatedAt: Date | null;
	summary: string | null;
	/** Comma-separated tags. */
	tags: string | null;
	sectionId: number | null;
	sectionName: string | null;
	fileId: number | null;
}

/** A snippet split around the first match so the page can render `<mark>` without raw HTML. */
export interface KbSnippet {
	before: string;
	match: string;
	after: string;
}

/** A search hit: the doc plus an optional snippet with the match offsets split out. */
export interface KbSearchHit {
	doc: KbDocView;
	snippet: KbSnippet | null;
}

/** A category with its docs, in the fixed KB_CATEGORY_ORDER. */
export interface KbCategoryGroup {
	category: string;
	docs: KbDocView[];
}

/**
 * The fixed category ordering for the Kunskapsbank landing view. Any category not in
 * this list sorts last (alphabetically).
 */
export const KB_CATEGORY_ORDER = [
	'Bygglov & process',
	'Entreprenad & inköp',
	'Utformning & teknik',
	'Mark & tomt',
	'Ekonomi'
] as const;

/** Split the comma-separated tags column into a clean list. */
export function parseTags(tags: string | null): string[] {
	if (!tags) return [];
	return tags
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);
}
