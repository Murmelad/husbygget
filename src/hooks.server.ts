import { error, type Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getEnv } from '$lib/server/platform';

/**
 * Auth. The whole app is private — no public routes, nothing edge-cached — so every request
 * is protected twice. Cloudflare Access (a self-hosted app on husbygget.nu, no path scope)
 * challenges the visitor at the edge and injects a signed JWT
 * (`Cf-Access-Jwt-Assertion`); this hook re-verifies that JWT against the team's public keys
 * and fails closed (403) if it is missing/invalid or the Access config slips — so the app
 * never goes public even if the edge app is removed or misconfigured.
 *
 * The verified `email` claim becomes `event.locals.userEmail` (dev: `dev@local`), feeding the
 * decision log. Config (`wrangler.jsonc` `vars`): CF_ACCESS_TEAM_DOMAIN + CF_ACCESS_AUD
 * (comma-separate to rotate apps). See CLAUDE.md ("Access app") for the Zero Trust setup.
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksTeam = '';

export const handle: Handle = async ({ event, resolve }) => {
	if (dev) {
		event.locals.userEmail = 'dev@local';
		return resolve(event);
	}

	const env = getEnv(event.platform);
	const team = env?.CF_ACCESS_TEAM_DOMAIN;
	const auds = (env?.CF_ACCESS_AUD ?? '').split(',').filter(Boolean);
	if (!team || !auds.length) {
		throw error(403, 'Access is not configured (CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD)');
	}

	const token = event.request.headers.get('cf-access-jwt-assertion');
	if (!token) throw error(403, 'Forbidden');

	if (!jwks || jwksTeam !== team) {
		jwks = createRemoteJWKSet(new URL(`https://${team}/cdn-cgi/access/certs`));
		jwksTeam = team;
	}
	try {
		const { payload } = await jwtVerify(token, jwks, {
			issuer: `https://${team}`,
			audience: auds
		});
		event.locals.userEmail = payload.email as string | undefined;
	} catch {
		throw error(403, 'Forbidden');
	}

	return resolve(event);
};
