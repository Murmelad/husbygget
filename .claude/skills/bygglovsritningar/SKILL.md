---
name: bygglovsritningar
description: Produce fackmannamässiga Swedish bygglov drawings (situationsplan, planritning, fasader, sektion, markplanering) as scaled SVG from a described starting point and/or the user's uploaded freehand sketches. Use when the user wants to mock up the house, translate sketches into schematics, or prepare the drawing set for Trelleborg's bygglovsansökan.
---

# Bygglovsritningar — from sketch to fackmannamässig handling

Goal: drawings that pass Trelleborg's "fackmannamässigt" bar — **skalenliga, måttsatta,
tunna svarta linjer på vit bakgrund, inga perspektiv, PDF ≤ 5 MB/fil** — generated from
ONE shared plan model so all drawings agree with each other (a stated kommun requirement).

## The one rule that makes everything work

**Never draw geometry twice.** Maintain a single plan model (JSON, all lengths in mm)
in `design/ritningar/planmodell.json`; every drawing is generated from it. If the user
changes a wall on the plan, regenerate fasader/sektion — never hand-tweak one drawing.

```jsonc
{
	"fastighet": { "beteckning": "<FASTIGHETSBETECKNING>", "tomtM2": 3000 },
	"byggnad": {
		"yttermatt": { "b": 15600, "d": 9000 }, // mm
		"vagg": { "ytter": 400, "inner": 120 }, // nominell tjocklek
		"fg": 12.35, // FG+ (möh, från nybyggnadskartan)
		"rumshojd": 2500,
		"taklutning": 27,
		"takform": "sadeltak",
		"nockhojd": 6200,
		"byggnadshojd": 3900, // från mark medel
		"fasad": { "material": "stående träpanel", "kulor": "NCS S 4550-Y90R (faluröd)" },
		"tak": { "material": "betongpannor", "kulor": "grafitgrå" }
	},
	"rum": [
		{
			"namn": "Kök",
			"m2": 18.4,
			"polygon": [
				[0, 0],
				[4200, 0],
				[4200, 4400],
				[0, 4400]
			]
		}
	],
	"oppningar": [
		{ "typ": "dorr", "vagg": "syd", "pos": 7200, "bredd": 1000, "slagning": "in-höger" },
		{ "typ": "fonster", "vagg": "vast", "pos": 2000, "bredd": 1500, "brostning": 900, "hojd": 1300 }
	],
	"tomt": {
		"grans": [
			[0, 0],
			[55000, 0],
			[55000, 55000],
			[0, 55000]
		],
		"byggnadPlacering": { "x": 18000, "y": 22000, "rotation": 0 },
		"gransAvstand": { "min": 4500 }
	}
}
```

## Workflow

**Fas 0 — Underlag.** Ask for/locate: nybyggnadskartan (BESTÄLL from kommunen — the
situationsplan MUST be based on it for nybyggnad), förhandsbeskedets villkor, tomtens
mått/höjder. Without the nybyggnadskarta, produce everything else and leave the
situationsplan as "preliminär — flyttas till nybyggnadskarta".

**Fas 1 — Mockup.** From the user's described starting point, build a first plan model
with reasonable assumptions (rumshöjd 2500, yttervägg 400, taklutning per beskrivning)
and render a QUICK plan + one fasad (label them SKISS — EJ BYGGLOVSHANDLING). Iterate
in conversation.

**Fas 2 — Skissintolkning.** The user photographs freehand drawings and uploads; Read
the image(s). Extract: room layout/topology, written measurements, door/window positions,
annotations. THEN reconcile: sum room dims + wall thicknesses vs yttermått — when they
don't add up (they won't), ask the user which measurements are load-bearing and adjust
the rest. Update the plan model; show a regenerated plan for confirmation before
polishing. Never silently invent a measurement — assumptions get listed and confirmed.

**Fas 3 — Ritningsset.** Generate from the model, one SVG per sheet, using
`MALL-A3.svg` in this skill folder as the sheet (A3 liggande, 420×297, ram,
ritningshuvud, skalstock, norrpil):

| Ritning                 | Skala                      | Måste visa (Trelleborgs krav)                                                                                                            |
| ----------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Situationsplan          | 1:400 (på nybyggnadskarta) | byggnadens placering MÅTTSATT till närmaste fastighetsgränser (≥2 mått), FG+, in-/utfart, parkering, norrpil                             |
| Markplaneringsritning   | 1:400                      | nya + befintliga marklinjer, sockelhöjd/FG+, infart, parkering, ev. dagvatten                                                            |
| Planritning             | 1:100                      | rumsindelning m. användning + m², yttermått, dörrbredder, kök/badrum-inredning, trappa/nivåskillnader, snittmarkering (A–A), väderstreck |
| Fasadritningar (alla 4) | 1:100                      | material + kulör (NCS), byggnadshöjd, taklutning, NYA och BEFINTLIGA marklinjer (befintlig streckad), väderstreck per fasad              |
| Sektionsritning A–A     | 1:100                      | rumshöjd, byggnadshöjd/nockhöjd, FG+, taklutning, marklinjer, snittbeteckning                                                            |

**Fas 4 — Granska & leverera.** Render each SVG → PNG (`npx --yes sharp-cli --input x.svg
--output x.png resize 1754 1240` ≈ A3 150dpi) and LOOK at it (Read the PNG) before
showing the user; check overlaps, text collisions, that the skalstock measures true.
Deliver: SVG + PNG in `design/ritningar/` (commit), and on request publish PNG/PDF to
Anteckningar on Bygglov-kortet (per design/DOKUMENT.md flow). PDF for inlämning: open
the SVG in a browser → print to PDF, A3, 100 % skala (no shrink!) — verify a known
measurement with a ruler on a test print.

## SVG conventions (the fackmannamässiga rules)

- **Sheet = paper mm**: viewBox `0 0 420 297`, 1 unit = 1 mm on paper. Geometry lives in
  `<g transform="scale(0.01) ...">` for 1:100 (0.0025 for 1:400) — model mm → paper mm.
  Annotations (text, måttsiffror, symbols) are placed in PAPER coordinates (divide model
  by 100/400) so text never scales.
- **Linjebredder** (paper mm): skurna väggar 0.5 · konturer 0.35 · inredning/detaljer
  0.18 · måttlinjer/stödlinjer 0.13. Allt svart (#000) på vitt — INGA tokens/färger här;
  bygglovsritningar är svartvita. Befintliga marklinjer: streckade (dash 2 1).
- **Text**: sans (Arial/Helvetica), ≥2.5 mm på papper; måttsiffror 2.5, rumsnamn 3,
  rubriker 5. Mått i **meter med en decimal** på situationsplan/fasad (t.ex. 4,5) och i
  **mm eller m,^1dec** konsekvent på plan — välj METER m. 1 decimal överallt om osäker
  (Stockholmskravet). Decimaltecken = komma.
- **Måttsättning**: måttkedjor utanför byggnadskroppen, stödlinjer 1 mm från kontur,
  måttlinje med snedstreck (/) vid ändarna, siffra ovanför linjen, centrerad.
- **Symboler**: dörr = öppning + kvartscirkelbåge (slagning); fönster = dubbla linjer i
  vägglivet; snitt = grov streckpunktlinje med A/A i cirklar; norrpil på situationsplan;
  skalstock på VARJE ritning (den finns i mallen — kontrollera att den stämmer med skalan!).
- **Ritningshuvud** (nedre högra hörnet, i mallen): fastighetsbeteckning · ritningstyp
  ("Fasadritning mot väster") · skala + format ("1:100 (A3)") · datum · "Upprättad av" ·
  rev-bokstav + datum vid ändring. Fyll ALLTID i alla fält.
- Alla ritningar i settet ska stämma inbördes — regenerera hela settet vid modelländring
  och bumpa rev på ALLA berörda blad.

## Gränser & ärlighet

- Detta producerar **bygglovshandlingar**, inte K-ritningar, energiberäkning eller
  brandskyddsbeskrivning (konstruktörens jobb, krävs först till tekniskt samråd).
- Tillgänglighetsminimum att rita in redan nu (annars föreläggande): entrédörr ≥0,9 m
  fritt passagemått till entréplanet, WC/dusch på entréplan med vändmått Ø1,3 m, trösklar
  låga. Flagga om användarens skiss bryter mot detta.
- Rekommendera alltid: kommunens gratis «Träffa en bygglovsarkitekt» med utkastet INNAN
  inlämning, och/eller en arkitekt-/KA-granskning. Förhandsbeskedets villkor ska synas
  uppfyllda i ritningarna.
- Vid tveksamhet om ett kommunkrav: kolla trelleborg.se «Vilka handlingar behövs?» —
  kraven i tabellen ovan hämtades därifrån 2026-07-18.

## Publicering i appen

Skisserna publiceras i appen under fliken **Ritningar**, versionerade. En ny version:
kopiera de fyra SVG:erna till `static/ritningar/vX.Y/` med de STABILA filnamnen
(`plan-bv.svg`, `plan-ov.svg`, `fasad-oster.svg`, `fasad-norr.svg` — varje version
återanvänder samma namn i sin egen mapp) och **PREPEND:a** en ny post i
`ritningsversioner` i `src/lib/ritningar.ts` (nyaste först — index 0 = senaste, som
`/ritningar` redirectar till). Ingen databas: manifestet är den enda källan.
