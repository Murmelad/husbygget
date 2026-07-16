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

### Engångsrunbook (ägare)

1. **GitHub-repo** `Murmelad/husbygget` (SSH som `murmelad`) → pusha `main`.
2. **Cloudflare dashboard** → Workers & Pages → Connect repo → build `npm run build`,
   deploy `npx wrangler deploy` (Node från `.node-version`). Inga GitHub Actions.
3. **Migreringar** körs aldrig automatiskt: `npm run db:migrate:remote` (kör om efter
   varje schemaändring).
4. **Zero Trust → Access → Applications → Add self-hosted:** domän **`husbygget.nu`**
   (custom domain, binds via `routes` i `wrangler.jsonc` vid deploy), ingen path; policy
   **Allow** med hushållets e-postadresser (one-time PIN). Lägg gärna till
   `husbygget.jens-naterman-e05.workers.dev` som extra hostname i samma app — annars är
   workers.dev-URL:en en oskyddad sidodörr tills AUD-verifieringen stoppar den (403).
5. **AUD-tag:** kopiera appens AUD till `wrangler.jsonc` `vars.CF_ACCESS_AUD` (tips: det
   är även `kid`-parametern i Access-loginens redirect-URL) → commit + push (vars binds
   vid deploy).
6. **Obs:** utan satt AUD svarar prod `403` (fail closed) — förväntat tills steg 5 är
   klart.
