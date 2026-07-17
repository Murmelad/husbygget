# DOKUMENT.md — kunskapsbankens dokumentstandard

Regler för HTML-dokument som bifogas i Anteckningar (researchunderlag, checkplaner,
sammanställningar). Målet: alla dokument läses som EN serie — samma typografi, samma
mörkt/ljust läge som appen, och navigerbara utan scroll-jakt.

## Så skapas ett nytt dokument

1. **Utgå ALLTID från `design/dokumentmall.html`** — kopiera hela filen, byt innehåll.
   Style-blocket är kanoniskt: ändra det i mallen först, och uppdatera då även äldre
   dokument vid nästa revidering.
2. **Titelblock**: logga + titel + undertitel + `docmeta`-rad
   `Skapad YYYY-MM-DD · Uppdaterad YYYY-MM-DD (vN: vad som ändrades) · Husbygget kunskapsbank`.
   Bumpa version + datum vid VARJE revidering.
3. **Innehållsförteckning** (`<nav class="toc">`) krävs vid fler än två `h2`-avsnitt.
   Varje `h2` får `id="s1"`, `"s2"`, … i dokumentordning.
4. **`<base target="_blank">` är obligatorisk** (alla länkar öppnar ny flik) — och därför
   MÅSTE TOC:ns ankarlänkar ha `target="_self"`, annars öppnar de en ny flik.
5. **Inga hårdkodade färger i innehållet** — bara mallens tokens (som följer appens ljusa
   och mörka läge). Standardkomponenter: `.info` (blå fakta), `.varning` (faluröd),
   `.klart` (grön avklarat), `.overspelat` (gråtonar överspelade avsnitt), `ul.check`
   (checklista), `.fas`-chip i h2, tabeller alltid i `<div class="scroll">`.
6. **Källor + friskrivning** sist i `.meta`-blocket.

## Publicering & revidering

- Ladda upp till R2 (`husbygget-files`) under nyckeln
  `entry/<entryId>/<uuid>/<filnamn>.html` med content-type `text/html; charset=utf-8`,
  och registrera raden i `journal_files` (entry_id, r2_key, name, content_type, size).
- **Revidering = skriv över SAMMA R2-nyckel** (länken består) + uppdatera `size` i
  `journal_files` + bumpa versionsraden i dokumentets titelblock + lägg gärna en rad
  sist i anteckningens body om vad som ändrats.
- **Indexet** (`Kunskapsbank — index`, egen anteckning utan avsnittskoppling) ska få en
  ny `.doc`-rad för varje nytt dokument: titel, tvårading, `vN · datum · avsnitt`.
  Dokumentlänkarna i indexet är relativa: `/anteckningar/fil/<journal_files.id>`.

## Skrivregler (för läsbarhetens skull)

- Öppna med det viktigaste: en `.klart`/`.varning`/`.info`-ruta som ger läget på 10 sekunder.
- Tabeller för jämförbara fakta, checklistor för handling, brödtext bara för resonemang.
- Svenska, «sentence case», konkreta belopp/datum hellre än omskrivningar.
- Markera avklarade avsnitt med `.overspelat` i stället för att radera dem — dokumenten
  är också projektets historik. Ta aldrig bort data vid revidering, addera.
