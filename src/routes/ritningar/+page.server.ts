import { redirect } from '@sveltejs/kit';
import { ritningsversioner } from '$lib/ritningar';
import type { PageServerLoad } from './$types';

// Skicka alltid vidare till den senaste versionen (index 0 = nyast i manifestet).
export const load: PageServerLoad = async () => {
	redirect(302, '/ritningar/' + ritningsversioner[0].version);
};
