# Husbygget

Privat husbyggnadsplanering bakom Cloudflare Access. Byggd på Cloudflare Workers
(Static Assets) + D1, SvelteKit 2 / Svelte 5 (runes), Tailwind 4, Drizzle ORM.
Denna fas är enbart ett skal — konfiguration, beroenden och platshållarsidor.

## Utveckla

```bash
npm install
npm run dev          # Vite/Svelte UI — inga Cloudflare-bindningar (D1) i detta läge
npm run build        # produktionsbygge (.svelte-kit/cloudflare)
npm run preview      # bygg + kör Workern lokalt (Miniflare, bindningar)
npm run check        # wrangler types + svelte-check (håll 0/0)
npm run lint         # prettier + eslint
npm run format       # prettier --write
```

## Databas (D1)

```bash
wrangler d1 create husbygget-db     # klistra in database_id i wrangler.jsonc
npm run db:generate                 # generera migrations-SQL till ./drizzle (offline)
npm run db:migrate:local            # applicera på lokal D1
npm run db:migrate:remote           # applicera på deployad D1
npm run db:studio                   # bläddra i schema/data
```

## Deploy

Push till `main` triggar den anslutna Cloudflare Workers Build (git-integration).
Manuellt:

```bash
npm run deploy       # = npm run build && wrangler deploy
```

Kontot kommer från `CLOUDFLARE_API_TOKEN` — `account_id` hålls utanför `wrangler.jsonc`.
