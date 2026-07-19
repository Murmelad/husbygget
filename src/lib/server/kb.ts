import { and, asc, eq, like } from 'drizzle-orm';
import {
	KB_CATEGORY_ORDER,
	type KbCategoryGroup,
	type KbDocView,
	type KbSearchHit,
	type KbSnippet
} from '$lib/kb';
import type { getDb } from './db';
import { bucketFromPlatform, dbFromPlatform } from './platform';
import { journalEntries, journalFiles, kbDocs, sections } from './db/schema';

type Db = ReturnType<typeof getDb>;

/** A kb doc joined with its section + HTML file id, plus the (heavy) search text. */
export type KbDocRow = KbDocView & { searchText: string | null };

/**
 * All kb docs joined with their entry's section (name) and the entry's HTML file id
 * (for the `/anteckningar/fil/{id}` link). Ordered by category then title.
 */
export async function listKbDocs(db: Db): Promise<KbDocRow[]> {
	return db
		.select({
			entryId: kbDocs.entryId,
			title: kbDocs.title,
			category: kbDocs.category,
			version: kbDocs.version,
			updatedAt: kbDocs.updatedAt,
			summary: kbDocs.summary,
			tags: kbDocs.tags,
			searchText: kbDocs.searchText,
			sectionId: journalEntries.sectionId,
			sectionName: sections.name,
			fileId: journalFiles.id
		})
		.from(kbDocs)
		.innerJoin(journalEntries, eq(kbDocs.entryId, journalEntries.id))
		.leftJoin(sections, eq(journalEntries.sectionId, sections.id))
		.leftJoin(
			journalFiles,
			and(eq(journalFiles.entryId, kbDocs.entryId), like(journalFiles.contentType, 'text/html%'))
		)
		.orderBy(asc(kbDocs.category), asc(kbDocs.title));
}

/** The entry ids that have a kb doc — for the Anteckningar "Kunskapsbank" chip. */
export async function listKbEntryIds(db: Db): Promise<number[]> {
	const rows = await db.select({ entryId: kbDocs.entryId }).from(kbDocs);
	return rows.map((r) => r.entryId);
}

// ---------------------------------------------------------------------------
// HTML → plain text (shared by reindex; also mirrored by the backfill script).
// ---------------------------------------------------------------------------

/** A small set of the named HTML entities that actually appear in the docs. */
const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	auml: 'ä',
	Auml: 'Ä',
	aring: 'å',
	Aring: 'Å',
	ouml: 'ö',
	Ouml: 'Ö',
	eacute: 'é',
	Eacute: 'É',
	mdash: '—',
	ndash: '–',
	hellip: '…',
	laquo: '«',
	raquo: '»',
	times: '×',
	deg: '°',
	middot: '·',
	bull: '•',
	shy: '',
	rsquo: '’',
	lsquo: '‘',
	ldquo: '“',
	rdquo: '”',
	euro: '€',
	copy: '©',
	reg: '®',
	trade: '™',
	frac12: '½',
	frac14: '¼',
	frac34: '¾'
};

function decodeEntities(s: string): string {
	return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, body: string) => {
		if (body[0] === '#') {
			const isHex = body[1] === 'x' || body[1] === 'X';
			const code = isHex ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
			return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : m;
		}
		return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body) ? NAMED_ENTITIES[body] : m;
	});
}

/**
 * Strip an HTML document to plain search text: drop `<style>`/`<script>` blocks, remove
 * all remaining tags, decode the common entities, collapse whitespace.
 */
export function htmlToText(html: string): string {
	return decodeEntities(
		html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
	)
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Re-derive `search_text` for every kb doc from its HTML in R2. For each doc: look up the
 * entry's HTML file key, fetch the object, strip it to plain text, store it. Returns the
 * number of docs re-indexed. Needs both the D1 and R2 bindings (via `platform`).
 */
export async function reindexKbDocs(platform: App.Platform | undefined): Promise<number> {
	const db = dbFromPlatform(platform);
	const bucket = bucketFromPlatform(platform);
	const docs = await db.select({ entryId: kbDocs.entryId }).from(kbDocs);

	let indexed = 0;
	for (const doc of docs) {
		const fileRows = await db
			.select({ r2Key: journalFiles.r2Key })
			.from(journalFiles)
			.where(
				and(eq(journalFiles.entryId, doc.entryId), like(journalFiles.contentType, 'text/html%'))
			)
			.limit(1);
		const key = fileRows[0]?.r2Key;
		if (!key) continue;

		const obj = await bucket.get(key);
		if (!obj) continue;

		const text = htmlToText(await obj.text());
		await db.update(kbDocs).set({ searchText: text }).where(eq(kbDocs.entryId, doc.entryId));
		indexed++;
	}
	return indexed;
}

// ---------------------------------------------------------------------------
// Search (in JS — Swedish case-folding, not SQL LIKE) + grouping.
// ---------------------------------------------------------------------------

const SNIPPET_RADIUS = 60;

/** Build a snippet around the first occurrence of `needle` (lowercased) in `text`. */
function buildSnippet(text: string, needle: string): KbSnippet | null {
	const idx = text.toLowerCase().indexOf(needle);
	if (idx === -1) return null;
	const start = Math.max(0, idx - SNIPPET_RADIUS);
	const end = Math.min(text.length, idx + needle.length + SNIPPET_RADIUS);
	return {
		before: (start > 0 ? '… ' : '') + text.slice(start, idx),
		match: text.slice(idx, idx + needle.length),
		after: text.slice(idx + needle.length, end) + (end < text.length ? ' …' : '')
	};
}

/** Drop the heavy `searchText` before handing a doc to the browser. */
function toView(d: KbDocRow): KbDocView {
	const { searchText: _searchText, ...view } = d;
	void _searchText;
	return view;
}

/**
 * Match `q` (case-insensitively) against title + summary + tags + search text of each doc.
 * Returns matching docs (search text stripped) with a snippet built from the search text.
 */
export function searchKbDocs(docs: KbDocRow[], q: string): KbSearchHit[] {
	const needle = q.toLowerCase();
	const hits: KbSearchHit[] = [];
	for (const doc of docs) {
		const haystack = [doc.title, doc.summary, doc.tags, doc.searchText]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
		if (!haystack.includes(needle)) continue;
		hits.push({ doc: toView(doc), snippet: buildSnippet(doc.searchText ?? '', needle) });
	}
	return hits;
}

/** Group docs by category in the fixed order; unknown categories last (alphabetical). */
export function groupKbByCategory(docs: KbDocRow[]): KbCategoryGroup[] {
	const byCat = new Map<string, KbDocView[]>();
	for (const d of docs) {
		const arr = byCat.get(d.category);
		if (arr) arr.push(toView(d));
		else byCat.set(d.category, [toView(d)]);
	}
	const out: KbCategoryGroup[] = [];
	for (const cat of KB_CATEGORY_ORDER) {
		const arr = byCat.get(cat);
		if (arr) {
			out.push({ category: cat, docs: arr });
			byCat.delete(cat);
		}
	}
	for (const cat of [...byCat.keys()].sort((a, b) => a.localeCompare(b, 'sv'))) {
		out.push({ category: cat, docs: byCat.get(cat)! });
	}
	return out;
}
