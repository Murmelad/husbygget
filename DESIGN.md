# DESIGN.md — Husbygget

The visual contract for every page. Authored with the design system in `src/app.css`
(tokens) + `src/lib/components/` (primitives). A static mockup of Översikt locking the
direction lives in `design/mockup.html` — open it in a browser when in doubt.

## Identity: "byggritning"

The app looks like an architect's working drawing: drafting-ink blue on cool
drawing-paper neutrals, DIN-style display lettering, mono micro-labels like drawing
annotations, hatching for the one state that matters. Dark mode is a **night blueprint**
(deep blue-slate ground), not an inversion — both modes ship via
`prefers-color-scheme`, and `<ThemeToggle>` (header) lets the user pin an override
(`data-theme` on `<html>`, persisted in localStorage, applied pre-paint in `app.html`).
The three token blocks in `app.css` (media-query dark, `data-theme` dark/light) must
stay token-for-token in sync.

**Faluröd is reserved.** The red family appears ONLY for over-budget/danger. Never use
it as decoration, never as a second accent.

## Tokens (defined in `src/app.css`, consumed as Tailwind utilities)

| Token / utility                          | Light                 | Dark                  | Role                                                         |
| ---------------------------------------- | --------------------- | --------------------- | ------------------------------------------------------------ |
| `ground`                                 | `#f2f3ef`             | `#16202b`             | page background                                              |
| `panel` / `panel-2`                      | `#fdfdfb` / `#f7f8f4` | `#1d2630` / `#222d39` | cards / inner surfaces                                       |
| `ink` / `dim`                            | `#212b33` / `#5d6b74` | `#e5eaee` / `#93a1ad` | text / muted text                                            |
| `line` / `line-strong`                   | `#dde1da` / `#c3cac1` | `#33404d` / `#46545f` | hairlines / borders                                          |
| `accent` (+`-ink`, `-tint`, `-contrast`) | `#1f639e`             | `#5493cc`             | drafting blue: selection, links, primary actions, meter fill |
| `klar` (+`-tint`)                        | `#1d6b3c`             | `#35855a`             | status Klar                                                  |
| `pagar` (+`-ink`, `-tint`)               | `#c2841a`             | `#c08631`             | status Pågår                                                 |
| `danger` (+`-tint`)                      | `#96261a`             | `#b8422f`             | faluröd: over budget, destructive                            |

Palette is CVD/contrast-validated in both modes on the condition that **status colors
always carry a text label** and over-budget carries **hatch texture + text** — never
color alone.

Fonts: `font-display` (Bahnschrift → Arial Narrow → system) for the wordmark, headings,
tile values, timeline numbers; `font-sans` (Segoe UI/system) for body; `font-mono`
(Cascadia Mono) for `.eyebrow` micro-labels and meter scales. Radii: `rounded-card`
(9px) for cards, `rounded-ctl` (6px) for buttons/inputs/tiles.

## Hard rules

1. **No hardcoded palette hex in pages/components** — semantic utilities only
   (`bg-panel`, `text-dim`, `border-line`, `bg-accent`, …). If a needed shade is
   missing, add a token to `app.css`, don't inline it.
2. **Every SEK amount**: `formatSEK()` from `$lib/money` + the `.money` class
   (tabular-nums). Large scale labels may use `formatMkr()`.
3. **Status is never color-alone**: use `<StatusBadge>` (dot + Swedish label).
4. **All strings Swedish.** Sentence case ("Lägg till avsnitt", not "Lägg Till").
5. Icon-only controls need `title` + `aria-label`. Destructive actions are
   `variant="danger"` with a two-step inline confirm.
6. Wide content scrolls in its own `overflow-x-auto` container; the page never
   scrolls sideways. Mobile-first — card rows `flex-wrap` on narrow screens.

## Page anatomy

**Shell:** `<main class="mx-auto max-w-3xl px-5 pb-16">`. Header: wordmark
`HUSBYGGET` (`font-display`, bold, `tracking-[0.14em]` uppercase, the "GG" in
`text-accent`) + right-aligned nav (Översikt / Inställningar) in `font-display`
uppercase; active link gets `border-b-2 border-accent text-ink`, inactive `text-dim`.
Header bottom border: `border-b-2 border-ink` (the strong "title block" rule).

**Budget board (Översikt top):** one `panel` card containing an `.eyebrow` ("BUDGET") +
"X av Y beslut fattade" (text-dim, from `decidedCount/decidableCount`), then three
tiles (`panel-2`, `rounded-ctl`): _Total budget_, _Valt hittills_, _Kvar_ — values in
`font-display` 24px bold `.money`; the Kvar value is `text-klar`, or `text-danger` when
over. Below: `<ProgressBar>`. When over budget, add a banner directly under the board:
`bg-danger-tint border border-danger rounded-ctl`, text: **Över budget:**
"{diff} över taket — byt något val."

**Timeline (Byggordning):** vertical rule (`2px`, `line-strong`) with a 32px numbered
node per section (`font-display` bold): klar → filled `bg-klar` white "✓"; pågår →
`border-pagar` number in `pagar-ink`; ej påbörjad → `border-line-strong` number in
`dim`. Section cards to the right of the rule:

- **Pure task** (0 options): name, `<StatusBadge>`, right-aligned _ingen kostnad_
  (italic, dim).
- **Fixed cost** (1 option): name, badge, cost right-aligned bold `.money`.
- **Decision** (≥2 options): a `<Details>` card. Summary row: name, badge, selected
  option name (dim), cost, and a "N alternativ ▾" chip (`border-line-strong`,
  `text-accent-ink`, rounded-full). Expanded: option rows as radio labels
  (`border-line rounded-ctl`; selected row `border-accent bg-accent-tint` + a "VALD"
  chip in `accent-ink`), each with name (semibold), description (dim, 12.5px), cost
  right; swapping submits the `selectOption` form action immediately (radio
  `onchange` → requestSubmit, works without JS via a fallback "Välj" submit). Last row:
  a dashed "+ Lägg till alternativ" affordance.
- Notes render under the row (`text-dim` 13px), edited inline via a small form.

**Inställningar:** same shell. Sections list (all incl. archived — archived rows at
60% opacity with an "Arkiverad" chip + "Återställ") with up/down move buttons
(icon-only, titled), rename, status, archive. Per-section option editing in `<Details>`
panels. Total budget as a labelled `.money` input + Spara. Use `<EmptyState>` when
there are no sections ("Inga avsnitt ännu. Lägg till det första — t.ex. Tomt eller
Bygglov.").

## Component APIs (`$lib/components/`)

- `<Button variant="primary|secondary|danger|subtle" size="sm|md" href? type?>` —
  type defaults to `submit` (form-action world). Primary = accent; use sparingly
  (≈one per view section).
- `<StatusBadge status={SectionStatus} />`
- `<ProgressBar totalBudget allocated class? />` — handles the over-budget hatch +
  aria-label + scale row itself.
- `<Details open? class?>` with `{#snippet summary()}…{/snippet}` + children — the
  disclosure primitive (decision cards, admin edit panels).
- `<EmptyState class?>` — dashed muted panel.
- `<MoneyInput name id? value? required? placeholder? class?>` — SEK input that live-formats
  with sv-SE thousand grouping (parity with `formatSEK`). Use for ALL cost/budget fields;
  the server's `intOf()` strips whitespace before parsing.

Shared modules: `$lib/status` (`SECTION_STATUSES`, `SectionStatus`, `STATUS_LABELS`,
`isSectionStatus`) and `$lib/money` (`formatSEK`, `formatMkr`). The Drizzle schema
should type its status column with `SectionStatus` imported from `$lib/status` —
single source, no drift.
