---
name: vetting-research
description: Research and vet companies, prices, or regulations for the house build, verify claims adversarially, and fold results into the kunskapsbank + plan. Use when the user asks to research contractors/suppliers/costs/rules, hands over deepscout JSON exports from Downloads, or asks to "verify claims" in research material.
---

# Vetting research — workflow & hard-won lessons

The loop: **gather → VERIFY → fold in**. Never let unverified research touch the plan's
numbers or the kunskapsbank without flags.

## 1. Gather

- **Check `C:\Users\JensNaterman\Downloads\research-*.json` FIRST** — the user runs
  deepscout jobs (via ai-gw /research) and drops exports there. `job.question` +
  `job.report` is what you need; `steps` only carry clipped metadata (≤6 KB, no page
  text) — an export with `status: "running"` and empty report is NOT salvageable; redo
  the research instead (deepscout may still self-complete via its retry queue).
- **Craft deepscout questions entity-rich**: name the companies/kommun explicitly, state
  the exact data wanted (org.nr, omsättning/soliditet, omdömen per platform, referens-
  objekt), scope the region. deepscout plans 3–5 keyword queries FROM the question — a
  vague question gives shallow rounds. `maxRounds: 4, urlsPerRound: 12` is the good shape.
  One combined screening run over ~5 entities first; a dedicated run per finalist.
- **Heavy research not done by deepscout → Opus subagents** (user's standing model split:
  Fable designs, Opus researches/implements). Brief agents to be adversarial and to map
  entities by org.nr.

## 2. VERIFY (the step that has caught real errors)

- **Identity before data — always via org.nr.** A deepscout run condemned "Edvardsson
  Bygg AB" for bankruptcy; that was **E Edvardsson Bygg AB, Göteborg** — a namesake. The
  real candidate (Edvardssons Bygg i Skåne AB, 559475-1207) was clean but a 1-person
  2024 startup. NEVER attribute financials/judgments to a company whose org.nr you
  haven't matched to the actual candidate (their website ↔ registry).
- **Source hierarchy**: kommun/myndighet page > registries (allabolag/merinfo/ratsit/
  syna/krafman) > company's own site > review platforms (reco verified > others) >
  blogs/SEO pages. lawinsider.com can hold real taxa/contract excerpts (often at an OLD
  index year — check!). Reviews on a company's OWN site count for little.
- **Leadgen/jour sites are not contractors** (Done, Clas Fixare, Rörjour247, Svenska
  Eljouren, "Byggfirma <ort>.se" patterns, xn-- domains) — flag ⚠️, demand the executing
  org.nr.
- **Verify the ONE claim that moves money** by fetching the primary source yourself
  (example: Trelleborg's riktlinjer page confirmed kommunen provides the LTA pump —
  that reversed a 50 tkr plan line). bolagsfakta/merinfo block WebFetch (403) — verify
  registry data via WebSearch snippets or allabolag instead.
- **Flag system** everywhere: ✅ verified for Trelleborg-området · 🟡 plausible/unconfirmed
  · ⚠️ leadgen or unverified identity.

## 3. Fold in

- **Documents**: author per `design/DOKUMENT.md` from `design/dokumentmall.html`
  (canonical style, TOC with `target="_self"`, versioned title block). Revisions
  OVERWRITE the same R2 key + bump the version row + append a note to the entry body.
  Never delete earlier data — add sections, use `.overspelat` for superseded parts.
- **Publish flow** (prod, via wrangler): insert `journal_entries` (section-linked;
  Bygglov = projektering topics, Entreprenadform = contractor topics, NULL = index),
  `wrangler r2 object put husbygget-files/entry/<id>/<uuid>/<name>.html --content-type
  "text/html; charset=utf-8" --remote`, insert `journal_files` row (name, size!).
  Update the index doc (`Kunskapsbank — index`, entry without section) with a new
  `.doc` row. Write SQL to a scratchpad FILE and run with `--file` (åäö-safe); get ids
  with a separate `SELECT max(id)` + the `$r.Substring($r.IndexOf('['))` JSON parse.
- **Plan data**: update option costs/descriptions with the verified figure + source +
  caveat in the description; restructure a section into a decision when research
  reveals alternatives (e.g. kommunens LTA-enhet vs egen pump). ALWAYS write
  `decision_log` rows (`user_email: 'claude'`) so changes are auditable in-app.
- **CLAUDE.md "Project status"** section: update when facts change (förhandsbesked,
  tomt size, verified fees). Commit + push — the repo is the source of truth.

## Known facts already verified (don't re-research)

- Trelleborg VA-taxa components (2022 level): servis 55 066 · FP 49 559 · tomtyta
  31,88 kr/m² · bostadsenhet 22 316. Tomten är ~3 000 m² → tomtyteavgift ≈ 95 640.
- LTA pump: kommunen tillhandahåller/äger/underhåller (riktlinjer, verified 2026-07-17);
  owner pays elinstallation + drift. Avtalsanslutning terms outside verksamhetsområdet
  still UNCONFIRMED — the standing question for Kretslopp och vatten (0410-73 30 00).
- Boverket's KA register is DISCONTINUED — use RISE/Kiwa/SBR/KARF.
- Geoteknik villa: 30–55 tkr (Sweco price page), MUR 1–4 weeks.
- Byggkostnad Skåne: arkitektritat GE 28–50 tkr/m²; kataloghus trä 17–30 tkr/m².
