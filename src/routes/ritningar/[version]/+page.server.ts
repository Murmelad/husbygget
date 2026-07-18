import { error } from '@sveltejs/kit';
import { ritningsversioner } from '$lib/ritningar';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const version = ritningsversioner.find((v) => v.version === params.version);
	if (!version) error(404, 'Versionen finns inte');

	// Undermenyn behöver bara version + datum, i manifestordning (nyast först).
	const versioner = ritningsversioner.map((v) => ({ version: v.version, datum: v.datum }));
	return { version, versioner };
};
