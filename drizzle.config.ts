import { defineConfig } from 'drizzle-kit';

// drizzle-kit GENERATES migration SQL into ./drizzle (offline, no creds).
// wrangler APPLIES it (db:migrate:local / :remote) so local and remote D1 share
// the exact same migration files.
export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	verbose: true,
	strict: true
});
