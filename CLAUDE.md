# CLAUDE.md — Husbygget

Guidance for AI agents working in this repo. Keep it current when conventions change.

## What this is

**Husbygget** — a private planner for the household's house build. An ordered timeline of
build sections (Tomt → Bygglov → … → Slutbesiktning) where a section optionally carries
**cost options**: 0 options = pure task, 1 = fixed cost line (auto-selected), ≥2 = a
swappable decision (Tak: betongpannor vs plåttak). Exactly one option is selected per
section per scenario; a global total budget drives the Valt hittills / Kvar dashboard,
updating on every swap. **Anteckningar** (the build journal) holds entries with text
and/or R2 file attachments, optionally linked to a section (`/anteckningar`, files
streamed via `/anteckningar/fil/[id]`). UI strings are **Swedish**; code/identifiers
English.

The whole app sits behind **Cloudflare Access** — no in-app auth, no public routes.
**Live:** https://husbygget.nu (custom domain via `routes` in wrangler.jsonc; the
workers.dev hostname is disabled and 404s — by design, see Access notes below).

## Project status — the actual house build (last updated 2026-07-17)

The repo also carries the BUILD's state; keep this section current so a fresh session
knows where the project stands:

- **Site:** north of Skåre, Trelleborgs kommun, OUTSIDE detaljplan, on Söderslätt
  farmland. **Tomt ≈ 3 000+ m²** (drives the VA tomtyteavgift hard). **POSITIVT
  FÖRHANDSBESKED exists (2026)** — valid 2 years from decision date, non-extendable;
  bygglov application must land inside that window and meet the besked's villkor.
  Biggest original risk (jordbruksmark/lokaliseringsprövning) is thereby cleared.
- **VA (verified 2026-07-17):** Trelleborg's taxa components at 2022 level = servis
  55 066 + FP 49 559 + tomtyta 31,88 kr/m² + bostadsenhet 22 316 → ≈222 600 kr for
  3 000 m²; plan carries 240 000 (indexed estimate). **LTA pump: kommunen provides,
  owns and maintains it** (verified in riktlinjerna) — owner pays elinstallation +
  drift; plan's pump line = 10 000 kr with egen pump 50 000 as reserve option.
  Outstanding with kommunen: exact 2026 figures + whether the AVTALSANSLUTNING
  (outside verksamhetsområdet) follows taxa/riktlinjer.
- **Leaning generalentreprenad** (own architect + one GE) — decision not yet ticked in
  the app (Entreprenadform section, 3 zero-cost options).
- **Kunskapsbank** (research docs, attached in Anteckningar; index = the section-less
  entry «Kunskapsbank — index»): bygglov-checkplan (FAS 0–6, revised for förhandsbesked),
  entreprenadformer (forms + bygglov impact), företagskandidater (per-category contractor
  shortlists incl. GE tender list). Authored per `design/DOKUMENT.md`.
- **Husritningar (skisser):** iterated via the repo skill `.claude/skills/bygglovsritningar/`
  (sketch→schematic workflow, Trelleborg requirements). Current state = **skiss v2** in
  `design/ritningar/` (skiss-v2-*.svg + `planmodell.json` = the single source of truth for
  geometry/decisions): based on the REAL Fiskarhedenvillan Skanör (13,2 × 7,2 m inv,
  1,5-plan, ~38°), garage as a 5,0 m extension of the main body (north end, portar in the
  gable, tvätt door = connection), övervåning mirrored (master+dress+bad south, skjutparti
  → balkong over uterum on south gable), small bedrooms merged with their klk, PASSAGE
  between them → apartment over the garage (open studio + bad/wc). Entré faces EAST,
  north is at the house's left gable. OBS: apartment = second bostadsenhet (extra VA
  bostadsenhetsavgift, must be declared in bygglov, check förhandsbesked villkor).
  **Published in the app under the Ritningar tab as version 0.1**
  (`static/ritningar/v0.1/` + manifest `src/lib/ritningar.ts`). Publish workflow for a new
  version: copy the four SVGs to `static/ritningar/vX.Y/` reusing the stable filenames
  (`plan-bv.svg`, `plan-ov.svg`, `fasad-oster.svg`, `fasad-norr.svg`) and **PREPEND** a new
  entry to `ritningsversioner` in `src/lib/ritningar.ts` (newest first — index 0 is latest).
- **Seeded plan facts** (prod D1): El 53 700 kr (Trelleborgs Energi 2026 exact), VA
  196 290 kr (national average — Trelleborg's prisbilaga not public, VERIFY with
  kommunen 0410-73 30 00), LTA-pump 50 000 kr (ask if huvudmannen provides it),
  Bredband 22 500 kr, Regnvattentank 10 000 l = open decision (2×5000 ≈ 70k vs
  1×10000 ≈ 60k, tank-only estimates).

## Stack & deploy

SvelteKit 2 / Svelte 5 (runes) · Tailwind 4 (CSS-first, no tailwind.config) · Drizzle
ORM/drizzle-kit (sqlite) · D1 `husbygget-db` (id `68027d00-37cc-46d9-bdf1-844c0bae6209`) ·
R2 `husbygget-files` (binding `BUCKET`, private — anteckningar attachments) ·
`@sveltejs/adapter-cloudflare` in **Workers static-assets mode** (`wrangler.jsonc`:
`main` + `assets`; config inlined in `vite.config.ts`, `svelte.config.js` empty) ·
compat flag `nodejs_als` · Node 22. Same Cloudflare account as the sibling projects
(`e053feb1c2434700db1071e3f57b7797`, carried by `CLOUDFLARE_API_TOKEN`, never in config).

Deploy = Cloudflare **Workers Builds** git integration: push to `main` → `npm run build`
→ `npx wrangler deploy` (verified working; every push auto-deploys in ~2 min).
**Migrations are NOT auto-applied** — run `npm run db:migrate:remote` after schema
changes (keep migrations additive). Manual deploy fallback: `npm run build &&
WRANGLER_SEND_METRICS=false npx wrangler deploy` — metrics MUST be off on this machine
(wrangler's metrics.json hits EPERM), and the deploy exits 1 at the final zone-routes
step (the local API token lacks husbygget.nu zone perms) **but the deployment IS
created** — verify with `npx wrangler deployments list` (prints OLDEST first).

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
- **"Beslut fattade" counts only sections with ≥2 non-archived options** — single-option
  sections are fixed cost lines, not decisions; the counter hides at 0 decidable.
- **Anteckningar**: entries (text and/or R2 files, optional section link) in
  `journal_entries`/`journal_files` (`src/lib/server/journal.ts`). Deleting an entry
  deletes its R2 objects. Files stream via `/anteckningar/fil/[id]` with
  `X-Content-Type-Options: nosniff`. Timeline cards show "Anteckningar (N)" chips.
- **All SEK inputs use `<MoneyInput>`** ($lib/components) — live sv-SE thousand grouping;
  the server `intOf()` strips whitespace before parsing. Never a raw `type="number"`
  for money.
- **Theme**: follows `prefers-color-scheme` + a `<ThemeToggle>` override (`data-theme`
  on `<html>`, persisted in localStorage, applied pre-paint by the script in
  `src/app.html`). app.css holds THREE token blocks (media-dark, data-theme dark/light)
  that must stay token-for-token in sync.

## Design system (binding)

`DESIGN.md` is the visual contract — read it before touching any page. Identity:
**"byggritning"** (architect's drawing) — drafting-blue accent, cool paper neutrals,
night-blueprint dark mode, **faluröd reserved for over-budget/danger**. Tokens live in
`src/app.css` (`@theme inline` → semantic utilities like `bg-panel`/`text-dim`/
`bg-accent`); **never hardcode palette hex or stock Tailwind colors in pages**. Use the
primitives in `$lib/components/` (Button, StatusBadge, ProgressBar, Details, EmptyState,
MoneyInput, ThemeToggle). Reference mockup: `design/mockup.html`.

**Logo system** (three sizes of one mark, "hus under uppbyggnad"):

- `static/favicon.svg` — tab icon: nocklyft (hovering roof) + door only, clean tile.
- `static/logo.svg` — large mark: blueprint tile with white grid + måttlinje + dashed
  gable window. Source for `static/apple-touch-icon.png` — regenerate after edits with
  `npx --yes sharp-cli --input static/logo.svg --output static/apple-touch-icon.png resize 180 180`.
- Header logo = inline SVG in `src/routes/+layout.svelte` (full-house outline, clean tile).
- All candidates/history: `design/logo-varianter.html`. Tile blue `#17549c`, strokes `#fdfdfb`.

## Conventions & gotchas

- Prettier: tabs, single quotes, no trailing comma, width 100. Keep `npm run check` 0/0.
- tsconfig has `checkJs: false` — required: with `main` set, `wrangler types` pulls the
  built bundle into the TS program (the ai-gw gotcha). Don't re-enable.
- `design/` is prettier-ignored (hand-formatted mockup, logo variants, document template).
- HTML documents attached in Anteckningar follow `design/DOKUMENT.md` (template:
  `design/dokumentmall.html` — canonical style, dark mode, TOC with `target="_self"`
  anchors, versioned title block; revisions overwrite the SAME R2 key).
- After changing `wrangler.jsonc`, run `npm run gen` or `check` fails.
- Repo: `github.com/Murmelad/husbygget`, push over SSH as the **murmelad** GitHub
  account; commit identity `murmelad <murmelad@users.noreply.github.com>` (repo-local,
  already configured — never the work identity).
- Access app (Zero Trust, team `lucky-silence-8229.cloudflareaccess.com`): self-hosted
  app `husbygget.nu` (app id `54952af6-ec18-4e0a-b235-f3bf75f0c24e`), policy = the two
  household emails, one-time PIN, 24h session. The AUD tag lives in `wrangler.jsonc`
  `vars.CF_ACCESS_AUD` (comma-separate to rotate); it is readable from the `kid` param
  in the Access login redirect. **Never add extra destinations to the app** — a dead
  second destination (the disabled workers.dev host) broke logins on mobile: Access
  chains the browser through EVERY destination post-login to set cookies, and stranded
  users on the 404 host. One app, one live destination.
- Journal/kunskapsbank data ops (seeding, doc uploads) are done via
  `npx wrangler d1 execute husbygget-db --remote` + `npx wrangler r2 object put` —
  see `design/DOKUMENT.md` for the document publish/revise workflow.
