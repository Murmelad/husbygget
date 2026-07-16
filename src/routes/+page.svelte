<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatSEK } from '$lib/money';
	import { SECTION_STATUSES, STATUS_LABELS } from '$lib/status';
	import Button from '$lib/components/Button.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import Details from '$lib/components/Details.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const summary = $derived(data.summary);

	type Row = PageData['summary']['sections'][number];
	type Sec = Row['section'];
</script>

<!-- Small status control: a select that submits on change (noscript submit fallback).
     stopPropagation keeps it from toggling an enclosing decision <details>. -->
{#snippet statusControl(s: Sec)}
	<form method="POST" action="?/setStatus" use:enhance class="contents">
		<input type="hidden" name="sectionId" value={s.id} />
		<select
			name="status"
			title="Ändra status"
			aria-label="Ändra status för {s.name}"
			value={s.status}
			onchange={(e) => e.currentTarget.form?.requestSubmit()}
			onclick={(e) => e.stopPropagation()}
			class="rounded-ctl border border-line-strong bg-panel-2 px-1.5 py-0.5 text-xs text-dim"
		>
			{#each SECTION_STATUSES as st (st)}
				<option value={st}>{STATUS_LABELS[st]}</option>
			{/each}
		</select>
		<noscript>
			<button
				type="submit"
				class="rounded-ctl border border-line-strong px-2 py-0.5 text-xs text-ink"
			>
				Spara
			</button>
		</noscript>
	</form>
{/snippet}

{#snippet node(s: Sec, n: number)}
	<div
		aria-hidden="true"
		class="absolute top-3.5 -left-[46px] grid size-8 place-items-center rounded-full border-2 font-display text-sm font-bold {s.status ===
		'klar'
			? 'border-klar bg-klar text-white'
			: s.status === 'pagar'
				? 'border-pagar bg-panel text-pagar-ink'
				: 'border-line-strong bg-panel text-dim'}"
	>
		{s.status === 'klar' ? '✓' : n}
	</div>
{/snippet}

<!-- The card header row, shaped by option count: pure task / fixed cost / decision. -->
{#snippet cardRow(row: Row)}
	{@const s = row.section}
	<div class="flex flex-wrap items-center gap-3 px-4 py-3">
		<span class="text-[15.5px] font-semibold">{s.name}</span>
		<StatusBadge status={s.status} />
		{@render statusControl(s)}
		{#if row.options.length >= 2}
			{#if row.selectedOptionId != null}
				{@const sel = row.options.find((o) => o.id === row.selectedOptionId)}
				{#if sel}<span class="text-[13.5px] text-dim">{sel.name}</span>{/if}
			{:else}
				<span class="text-[13.5px] text-dim italic">Inget val</span>
			{/if}
			<span class="money ml-auto font-semibold">
				{row.selectedCost != null ? formatSEK(row.selectedCost) : ''}
			</span>
			<span
				class="inline-flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-0.5 text-xs whitespace-nowrap text-accent-ink"
			>
				{row.options.length} alternativ
				<span class="group-[[open]]:hidden" aria-hidden="true">▾</span>
				<span class="hidden group-[[open]]:inline" aria-hidden="true">▴</span>
			</span>
		{:else if row.options.length === 1}
			<span class="money ml-auto font-semibold">
				{formatSEK(row.selectedCost ?? row.options[0].cost)}
			</span>
		{:else}
			<span class="ml-auto text-dim italic">ingen kostnad</span>
		{/if}
	</div>
{/snippet}

<!-- Radio option rows inside a decision card. Selecting submits immediately. -->
{#snippet optionList(row: Row)}
	<form method="POST" action="?/selectOption" use:enhance class="grid gap-2 p-3">
		<input type="hidden" name="sectionId" value={row.section.id} />
		{#each row.options as o (o.id)}
			<label
				class="flex cursor-pointer items-center gap-3 rounded-ctl border p-3 {o.id ===
				row.selectedOptionId
					? 'border-accent bg-accent-tint'
					: 'border-line'}"
			>
				<input
					type="radio"
					name="optionId"
					value={o.id}
					checked={o.id === row.selectedOptionId}
					onchange={(e) => e.currentTarget.form?.requestSubmit()}
					class="size-4 shrink-0 accent-accent"
				/>
				<span class="min-w-0 flex-1">
					<span class="block text-sm font-semibold">{o.name}</span>
					{#if o.description}
						<span class="block text-[12.5px] text-dim">{o.description}</span>
					{/if}
					{#if o.url}
						<a
							href={o.url}
							target="_blank"
							rel="noopener noreferrer"
							onclick={(e) => e.stopPropagation()}
							class="text-[12px] text-accent-ink underline">Länk</a
						>
					{/if}
				</span>
				{#if o.id === row.selectedOptionId}
					<span
						class="rounded-full border border-accent px-2 py-0.5 text-[11px] font-bold tracking-wide text-accent-ink uppercase"
						>Vald</span
					>
				{/if}
				<span class="money text-sm font-semibold">{formatSEK(o.cost)}</span>
			</label>
		{/each}
		<noscript>
			<div>
				<Button size="sm">Välj markerat</Button>
			</div>
		</noscript>
		<a
			href="/installningar"
			class="rounded-ctl border border-dashed border-line-strong px-3 py-2 text-left text-[13px] text-dim hover:text-accent-ink"
		>
			+ Lägg till alternativ
		</a>
	</form>
{/snippet}

<!-- Notes: current text always visible; expand to edit inline. -->
{#snippet noteBlock(s: Sec)}
	<details class="group/note px-4 pb-3 text-[13px] text-dim">
		<summary
			class="flex cursor-pointer list-none items-baseline gap-2 [&::-webkit-details-marker]:hidden"
		>
			{#if s.notes}
				<span class="min-w-0 flex-1">{s.notes}</span>
			{:else}
				<span class="min-w-0 flex-1 italic">Ingen anteckning</span>
			{/if}
			<span class="shrink-0 text-accent-ink">Ändra</span>
		</summary>
		<form method="POST" action="?/saveNotes" use:enhance class="mt-2 flex flex-col gap-2">
			<input type="hidden" name="sectionId" value={s.id} />
			<textarea
				name="notes"
				rows="2"
				class="w-full rounded-ctl border border-line bg-panel-2 px-2 py-1 text-[13px] text-ink"
				>{s.notes}</textarea
			>
			<div><Button variant="secondary" size="sm">Spara anteckning</Button></div>
		</form>
	</details>
{/snippet}

<section class="mt-6 rounded-card border border-line bg-panel p-5 shadow-card" aria-label="Budget">
	<div class="flex items-baseline justify-between gap-3">
		<span class="eyebrow">Budget</span>
		<span class="text-[13px] text-dim"
			>{summary.decidedCount} av {summary.decidableCount} beslut fattade</span
		>
	</div>

	<div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
		<div class="rounded-ctl border border-line bg-panel-2 px-3.5 pt-2.5 pb-3">
			<div class="text-[12.5px] text-dim">Total budget</div>
			<div class="money mt-0.5 font-display text-2xl font-bold">
				{formatSEK(summary.totalBudget)}
			</div>
		</div>
		<div class="rounded-ctl border border-line bg-panel-2 px-3.5 pt-2.5 pb-3">
			<div class="text-[12.5px] text-dim">Valt hittills</div>
			<div class="money mt-0.5 font-display text-2xl font-bold">{formatSEK(summary.allocated)}</div>
		</div>
		<div class="rounded-ctl border border-line bg-panel-2 px-3.5 pt-2.5 pb-3">
			<div class="text-[12.5px] text-dim">Kvar</div>
			<div
				class="money mt-0.5 font-display text-2xl font-bold {summary.overBudget
					? 'text-danger'
					: 'text-klar'}"
			>
				{formatSEK(summary.remaining)}
			</div>
		</div>
	</div>

	<ProgressBar totalBudget={summary.totalBudget} allocated={summary.allocated} class="mt-4" />

	{#if summary.overBudget}
		<div
			class="mt-4 flex flex-wrap items-baseline gap-2 rounded-ctl border border-danger bg-danger-tint px-3.5 py-2.5 text-sm"
		>
			<b class="font-semibold text-danger">Över budget:</b>
			<span class="money">{formatSEK(-summary.remaining)} över taket — byt något val.</span>
		</div>
	{/if}
</section>

{#if form && 'error' in form && form.error}
	<div
		class="mt-4 rounded-ctl border border-danger bg-danger-tint px-3.5 py-2.5 text-sm text-danger"
		role="alert"
	>
		{form.error}
	</div>
{/if}

{#if summary.sections.length === 0}
	<EmptyState class="mt-8">
		Inga avsnitt ännu.
		<a class="font-semibold text-accent-ink underline" href="/installningar"
			>Lägg till det första i Inställningar.</a
		>
	</EmptyState>
{:else}
	<section class="relative mt-8 pl-[46px]" aria-label="Byggordning">
		<div
			class="pointer-events-none absolute top-2 bottom-2 left-[15px] w-0.5 bg-line-strong"
			aria-hidden="true"
		></div>
		<h2
			class="mb-3.5 -ml-[46px] font-display text-[15px] font-bold tracking-[0.1em] text-dim uppercase"
		>
			Byggordning
		</h2>

		{#each summary.sections as row, i (row.section.id)}
			<div class="relative mb-3.5">
				{@render node(row.section, i + 1)}
				{#if row.options.length >= 2}
					<Details class="group">
						{#snippet summary()}
							{@render cardRow(row)}
						{/snippet}
						{@render optionList(row)}
					</Details>
					<div class="mt-1">{@render noteBlock(row.section)}</div>
				{:else}
					<div class="rounded-card border border-line bg-panel shadow-card">
						{@render cardRow(row)}
						{@render noteBlock(row.section)}
					</div>
				{/if}
			</div>
		{/each}
	</section>
{/if}
