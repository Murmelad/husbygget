import { error } from '@sveltejs/kit';
import { bucketFromPlatform, dbFromPlatform } from '$lib/server/platform';
import { getFile } from '$lib/server/journal';
import type { RequestHandler } from './$types';

/**
 * `Content-Disposition` value that survives non-ASCII names: a sanitized ASCII
 * `filename=` fallback plus an RFC 5987 `filename*=UTF-8''…` for modern clients.
 */
function contentDisposition(name: string): string {
	const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
	return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export const GET: RequestHandler = async ({ params, platform }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) throw error(404, 'Filen hittades inte.');

	const db = dbFromPlatform(platform);
	const file = await getFile(db, id);
	if (!file) throw error(404, 'Filen hittades inte.');

	const obj = await bucketFromPlatform(platform).get(file.r2Key);
	if (!obj) throw error(404, 'Filen hittades inte.');

	return new Response(obj.body, {
		headers: {
			'Content-Type': file.contentType,
			'Content-Disposition': contentDisposition(file.name),
			'Content-Length': String(obj.size),
			'Cache-Control': 'private, max-age=0',
			// Uploaded content must never be sniffed into something executable.
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
