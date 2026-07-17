# CLAUDE.md — Husbygget

Guidance for AI agents working in this repo. Keep it current when conventions change.

## What this is

**Husbygget** — a private planner for the household's house build. An ordered timeline of
build sections (Tomt → Bygglov → … → Slutbesiktning) where a section optionally carries
**cost options**: 0 options = pure task, 1 = fixed cost line (auto-selected), ≥2 = a
swappable decision (Tak: betongpannor vs plåttak). Exactly one option is selected per
section per scenario; a global total budget drives the Valt hittills / Kvar dashboard,
updating on every swap. A **Dagbok** (build journal) holds entries with text and/or R2
file attachments, optionally linked to a section (`/dagbok`, files streamed via
`/dagbok/fil/[id]`). UI strings are **Swedish**; code/identifiers English.

The whole app sits behind **Cloudflare Access** — no in-app auth, no public routes.

## Stack & deploy

SvelteKit 2 / Svelte 5 (runes) · Tailwind 4 (CSS-first, no tailwind.config) · Drizzle
ORM/drizzle-kit (sqlite) · D1 `husbygget-db` (id `68027d00-37cc-46d9-bdf1-844c0bae6209`) ·
R2 `husbygget-files` (binding `BUCKET`, private — dagbok attachments) ·
`@sveltejs/adapter-cloudflare` in **Workers static-assets mode** (`wrangler.jsonc`:
`main` + `assets`; config inlined in `vite.config.ts`, `svelte.config.js` empty) ·
compat flag `nodejs_als` · Node 22. Same Cloudflare account as the sibling projects
(`e053feb1c2434700db1071e3f57b7797`, carried by `CLOUDFLARE_API_TOKEN`, never in config).

Deploy = Cloudflare **Workers Builds** git integration: push to `main` → `npm run build`
→ `npx wrangler deploy`. **Migrations are NOT auto-applied** — run
`npm run db:migrate:remote` after schema changes (keep migrations additive).

```sh
npm run dev                # local; D1 emulated (Access bypassed in dev)
npm run check              # wrangler types + svelte-check — keep 0/0
npm run lint               # prettier + eslint
npm run db:generate        # after editing src/lib/server/db/schema.ts
npm run db:migrate:local   # / :remote
```

## Architecture invariants (do not break)

- **Bindings are request-scoped** — never module-level. Server code gets them via
  `src/lib/server/platform.ts` (`getEnv(platform)`, `dbFromPlatform(platform)`);
  `platform.env` is typed `unknown` by the adapter — these helpers cast once.
- **All mutations are SvelteKit form actions** (`+page.server.ts`), no JSON API routes.
  SvelteKit's built-in CSRF origin check stays ON.
- **Auth = Cloudflare Access, verified in `src/hooks.server.ts`** (jose JWT against the
  team certs; pattern from `../custom-stuff`): ALL routes protected, fail-closed 403 in
  prod when `CF_ACCESS_TEAM_DOMAIN`/`CF_ACCESS_AUD` (wrangler `vars`) are empty/invalid,
  bypassed in `npm run dev`. The verified JWT `email` claim lands in
  `event.locals.userEmail` (dev: `dev@local`) and is written to `decision_log`.
- **Selections are scenario-keyed** (`unique(scenario_id, section_id)`); v1 uses the
  seeded scenario 1 'Plan' (`settings.active_scenario_id`). Named scenarios later =
  new rows + a switcher, NO migration. The total budget is global (one household
  ceiling), not per-scenario.
- **Archive first; delete only archived things.** Archiving a selected option CLEARS
  the selection (no auto-reselect — the cost must not silently reappear as another
  option; `setOptionArchived`). Archived options (`deleteOption`) and archived sections
  (`deleteSection`, cascades options + selections) may be hard-deleted: `decision_log`
  keeps its detail text with the FK columns nulled.
- **First option auto-selects** (`createOption`) so fixed-cost lines count without
  special-casing. Budget math lives in `budget.getSummary` (few queries, joined in JS —
  no N+1).
- **Money = whole-SEK integers** (no öre, no floats). Format with `formatSEK()`
  (`$lib/money`) + the `.money` class. Timestamps = `timestamp_ms` integers.
- **Status keys** `ej_paborjad | pagar | klar` are single-sourced in `$lib/status.ts`
  (schema re-exports them) — Swedish labels only there.
- **Sparse sortOrder** (10/20/30…): move = swap with the adjacent non-archived neighbor.

## Design system (binding)

`DESIGN.md` is the visual contract — read it before touching any page. Identity:
**"byggritning"** (architect's drawing) — drafting-blue accent, cool paper neutrals,
night-blueprint dark mode, **faluröd reserved for over-budget/danger**. Tokens live in
`src/app.css` (`@theme inline` → semantic utilities like `bg-panel`/`text-dim`/
`bg-accent`); **never hardcode palette hex or stock Tailwind colors in pages**. Use the
primitives in `$lib/components/` (Button, StatusBadge, ProgressBar, Details, EmptyState).
Reference mockup: `design/mockup.html`.

## Conventions & gotchas

- Prettier: tabs, single quotes, no trailing comma, width 100. Keep `npm run check` 0/0.
- tsconfig has `checkJs: false` — required: with `main` set, `wrangler types` pulls the
  built bundle into the TS program (the ai-gw gotcha). Don't re-enable.
- `design/` is prettier-ignored (hand-formatted mockup).
- After changing `wrangler.jsonc`, run `npm run gen` or `check` fails.
- Repo: `github.com/Murmelad/husbygget`, push over SSH as the **murmelad** GitHub
  account; commit identity `murmelad <murmelad@users.noreply.github.com>` (repo-local,
  already configured — never the work identity).
- Access app (Zero Trust, team `lucky-silence-8229.cloudflareaccess.com`): self-hosted
  app on the workers.dev hostname, household emails, one-time PIN. The AUD tag goes in
  `wrangler.jsonc` `vars.CF_ACCESS_AUD` (comma-separate to rotate). Tip: the AUD is
  readable from the `kid` param in the Access login redirect.
