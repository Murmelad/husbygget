import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// SvelteKit + Cloudflare config lives inline here (svelte.config.js is intentionally
// empty). Workers static-assets mode: adapter-cloudflare emits .svelte-kit/cloudflare
// (_worker.js + static assets), pointed at by wrangler.jsonc `main` + `assets`.
export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter()
		})
	]
});
