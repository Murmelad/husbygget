import { error } from '@sveltejs/kit';
import { getDb } from './db';

/**
 * App-level environment: the Cloudflare bindings this app needs plus the Access
 * vars declared in `wrangler.jsonc` (`vars`) / secrets. Kept as a small standalone
 * interface (rather than `extends Env`) so the server layer doesn't depend on the
 * generated `worker-configuration.d.ts` literal-typed vars.
 */
export interface AppEnv {
	/** D1 binding (`husbygget-db`). */
	DB: D1Database;
	/** Cloudflare Access team domain, e.g. `foo.cloudflareaccess.com`. */
	CF_ACCESS_TEAM_DOMAIN?: string;
	/** Cloudflare Access application AUD tag (empty = fail closed in prod). */
	CF_ACCESS_AUD?: string;
}

/**
 * Typed access to the Cloudflare bindings + app env.
 *
 * `App.Platform` from `@sveltejs/adapter-cloudflare` deliberately doesn't type `env`
 * (so it can be set in `src/app.d.ts`); `platform.env` is therefore effectively
 * `unknown` here. We cast once, in this helper, so every route/domain caller gets a
 * typed `AppEnv` without repeating the cast. Returns `undefined` when bindings are
 * absent (e.g. a non-Cloudflare context) — callers decide how to react.
 */
export function getEnv(platform: App.Platform | undefined): AppEnv | undefined {
	return (platform as { env?: AppEnv } | undefined)?.env;
}

/**
 * Convenience: a Drizzle client bound to the D1 database.
 * Throws a clear 500 if the `DB` binding is missing (run via `npm run dev` / `wrangler`).
 */
export function dbFromPlatform(platform: App.Platform | undefined) {
	const env = getEnv(platform);
	if (!env?.DB) {
		throw error(500, 'D1 binding "DB" unavailable — run via `npm run dev` or `wrangler`.');
	}
	return getDb(env.DB);
}
