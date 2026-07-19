<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/Button.svelte';
	import Details from '$lib/components/Details.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { parseTags, type KbDocView, type KbSnippet } from '$lib/kb';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const dtf = new Intl.DateTimeFormat('sv-SE', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	function fmtDate(d: Date | string | number | null): string {
		return d == null ? '' : dtf.format(new Date(d));
	}

	// Progressive enhancement: debounce input → submit the GET form. Without JS the form
	// still submits on Enter. keepfocus/replacestate keep the caret and history clean.
	let searchForm: HTMLFormElement;
	let debounce: ReturnType<typeof setTimeout>;
	function onInput() {
		clearTimeout(debounce);
		debounce = setTimeout(() => searchForm?.requestSubmit(), 300);
	}
</script>

<svelte:head>
	<title>Kunskapsbank · Husbygget</title>
</svelte:head>

<!-- Sidhuvud -->
<section class="mt-6">
	<span class="eyebrow">Researchunderlag</span>
	<h1 class="mt-1 font-display text-2xl font-bold text-ink">Kunskapsbank</h1>
	<p class="mt-1.5 text-sm text-dim">
		Projektets samlade researchdokument — sök i innehållet eller bläddra per kategori.
	</p>
</section>

<!-- Sök -->
<form
	bind:this={searchForm}
	method="GET"
	data-sveltekit-keepfocus
	data-sveltekit-replacestate
	class="mt-5"
	role="search"
>
	<input
		type="search"
		name="q"
		value={data.q}
		oninput={onInput}
		autocomplete="off"
		placeholder="Sök i dokumenten…"
		aria-label="Sök i dokumenten"
		class="w-full rounded-ctl border border-line bg-panel px-4 py-2.5 text-sm text-ink shadow-card placeholder:text-dim focus:border-accent focus:outline-none focus-visible:outline-none"
	/>
</form>

{#snippet docCard(doc: KbDocView, snippet: KbSnippet | null)}
	<article
		class="rounded-card border border-line bg-panel p-4 shadow-card transition-colors hover:border-accent"
	>
		<a
			href={doc.fileId != null ? `/anteckningar/fil/${doc.fileId}` : '#'}
			target="_blank"
			rel="noopener"
			class="font-display text-[15px] font-semibold text-ink no-underline hover:text-accent-ink hover:underline"
		>
			{doc.title}
		</a>

		<p class="mt-1 font-mono text-[11px] text-dim">
			{[doc.version, fmtDate(doc.updatedAt)].filter(Boolean).join(' · ')}
		</p>

		{#if doc.sectionId != null && doc.sectionName}
			<span
				class="mt-2 inline-flex items-center rounded-full border border-line-strong px-2.5 py-0.5 text-xs whitespace-nowrap text-accent-ink"
			>
				{doc.sectionName}
			</span>
		{/if}

		{#if doc.summary}
			<p class="mt-2 text-sm text-ink">{doc.summary}</p>
		{/if}

		{#if snippet}
			<p class="mt-2.5 rounded-ctl bg-panel-2 px-3 py-2 text-[13px] text-dim">
				{snippet.before}<mark class="rounded-[3px] bg-accent-tint px-0.5 text-ink"
					>{snippet.match}</mark
				>{snippet.after}
			</p>
		{/if}

		{#if parseTags(doc.tags).length > 0}
			<div class="mt-2.5 flex flex-wrap gap-1.5">
				{#each parseTags(doc.tags) as tag (tag)}
					<span class="rounded-full border border-line px-2 py-0.5 text-[11px] text-dim">{tag}</span
					>
				{/each}
			</div>
		{/if}
	</article>
{/snippet}

{#if data.mode === 'search'}
	<p class="mt-5 text-sm text-dim">
		{data.hits.length}
		{data.hits.length === 1 ? 'träff' : 'träffar'} för «{data.q}»
	</p>

	{#if data.hits.length === 0}
		<EmptyState class="mt-4">Inga träffar för «{data.q}». Prova ett annat sökord.</EmptyState>
	{:else}
		<div class="mt-4 grid gap-3">
			{#each data.hits as hit (hit.doc.entryId)}
				{@render docCard(hit.doc, hit.snippet)}
			{/each}
		</div>
	{/if}
{:else if data.total === 0}
	<EmptyState class="mt-8">Inga dokument i kunskapsbanken ännu.</EmptyState>
{:else}
	<div class="mt-8 grid gap-8">
		{#each data.groups as group (group.category)}
			<section>
				<h2 class="eyebrow mb-3">{group.category}</h2>
				<div class="grid gap-3 md:grid-cols-2">
					{#each group.docs as doc (doc.entryId)}
						{@render docCard(doc, null)}
					{/each}
				</div>
			</section>
		{/each}
	</div>
{/if}

<!-- Underhåll: reindex -->
<Details class="group mt-10">
	{#snippet summary()}
		<div class="flex items-center justify-between gap-3 px-4 py-3">
			<span class="text-sm font-semibold text-ink">Underhåll</span>
			<span class="shrink-0 text-dim" aria-hidden="true">
				<span class="group-[[open]]:hidden">▾</span>
				<span class="hidden group-[[open]]:inline">▴</span>
			</span>
		</div>
	{/snippet}
	<div class="grid gap-3 px-4 py-4">
		<p class="text-[13px] text-dim">
			{data.indexedCount} av {data.total} dokument i sökindex
		</p>
		<form method="POST" action="?/reindex" use:enhance>
			<Button variant="secondary" size="md">Uppdatera sökindex</Button>
		</form>
		{#if form && 'indexed' in form && form.indexed != null}
			<p class="text-[13px] text-klar">Indexerade {form.indexed} dokument</p>
		{/if}
	</div>
</Details>
