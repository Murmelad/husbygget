<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/Button.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Two-step inline confirm for deletes (one entry open at a time).
	let confirming = $state<number | null>(null);

	const sectionName = $derived(new Map(data.sections.map((s) => [s.id, s.name])));
	const kbEntries = $derived(new Set(data.kbEntryIds));

	const dtf = new Intl.DateTimeFormat('sv-SE', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
	function fmtDate(d: Date | number | string): string {
		return dtf.format(new Date(d)).replace(',', '');
	}

	function fmtSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		const kb = bytes / 1024;
		if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} kB`;
		const mb = kb / 1024;
		return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
	}

	const chipBase = 'rounded-full border px-3 py-1 text-xs font-semibold no-underline';
	const chipActive = 'border-accent bg-accent-tint text-accent-ink';
	const chipIdle = 'border-line-strong text-dim';
</script>

<!-- Composer -->
<section
	class="mt-6 rounded-card border border-line bg-panel p-5 shadow-card"
	aria-label="Ny anteckning"
>
	<span class="eyebrow">Ny anteckning</span>
	<form
		method="POST"
		action="?/addEntry"
		enctype="multipart/form-data"
		use:enhance
		class="mt-3 grid gap-3"
	>
		<textarea
			name="body"
			rows="3"
			placeholder="Vad hände på bygget idag?"
			class="w-full rounded-ctl border border-line bg-panel-2 px-3 py-2 text-sm text-ink placeholder:text-dim"
		></textarea>

		<div class="flex flex-wrap items-end gap-3">
			<div class="flex flex-col gap-1">
				<label for="entry-section" class="text-[13px] text-dim"
					>Koppla till avsnitt (valfritt)</label
				>
				<select
					id="entry-section"
					name="sectionId"
					class="rounded-ctl border border-line bg-panel-2 px-2 py-1.5 text-sm text-ink"
				>
					<option value="">Ingen koppling</option>
					{#each data.sections as s (s.id)}
						<option value={s.id}>{s.name}</option>
					{/each}
				</select>
			</div>

			<div class="flex flex-col gap-1">
				<label for="entry-files" class="text-[13px] text-dim">Bilagor (valfritt)</label>
				<input
					id="entry-files"
					name="files"
					type="file"
					multiple
					class="max-w-full text-sm text-dim file:mr-3 file:rounded-ctl file:border file:border-line-strong file:bg-panel-2 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-ink hover:file:bg-panel"
				/>
			</div>

			<Button variant="primary" size="md" class="ml-auto">Spara</Button>
		</div>
	</form>
</section>

{#if form && 'error' in form && form.error}
	<div
		class="mt-4 rounded-ctl border border-danger bg-danger-tint px-3.5 py-2.5 text-sm text-danger"
		role="alert"
	>
		{form.error}
	</div>
{/if}

<!-- Filter chips -->
<div class="mt-5 flex flex-wrap gap-2" aria-label="Filtrera på avsnitt">
	<a
		href="/anteckningar"
		aria-current={data.activeSectionId == null ? 'page' : undefined}
		class="{chipBase} {data.activeSectionId == null ? chipActive : chipIdle}"
	>
		Alla
	</a>
	{#each data.sections as s (s.id)}
		<a
			href="/anteckningar?avsnitt={s.id}"
			aria-current={data.activeSectionId === s.id ? 'page' : undefined}
			class="{chipBase} {data.activeSectionId === s.id ? chipActive : chipIdle}"
		>
			{s.name}
		</a>
	{/each}
</div>

<!-- Entries -->
{#if data.entries.length === 0}
	<EmptyState class="mt-8">
		Inga anteckningar ännu. Skriv den första — eller ladda upp bygglovet.
	</EmptyState>
{:else}
	<ul class="mt-6 grid list-none gap-3 p-0">
		{#each data.entries as { entry, files } (entry.id)}
			<li class="rounded-card border border-line bg-panel p-4 shadow-card">
				<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
					<span class="eyebrow">{fmtDate(entry.createdAt)}</span>
					{#if entry.userEmail}
						<span class="text-xs text-dim">{entry.userEmail}</span>
					{/if}
					{#if entry.sectionId != null}
						<a
							href="/anteckningar?avsnitt={entry.sectionId}"
							class="inline-flex items-center rounded-full border border-line-strong px-2.5 py-0.5 text-xs whitespace-nowrap text-accent-ink no-underline"
						>
							{sectionName.get(entry.sectionId) ?? `Avsnitt #${entry.sectionId}`}
						</a>
					{/if}
					{#if kbEntries.has(entry.id)}
						<a
							href="/kunskapsbank"
							class="inline-flex items-center rounded-full border border-accent bg-accent-tint px-2.5 py-0.5 text-xs whitespace-nowrap text-accent-ink no-underline"
						>
							Kunskapsbank
						</a>
					{/if}

					<span class="ml-auto flex items-center gap-1">
						{#if confirming === entry.id}
							<form
								method="POST"
								action="?/deleteEntry"
								use:enhance={() =>
									async ({ update }) => {
										confirming = null;
										await update();
									}}
								class="contents"
							>
								<input type="hidden" name="entryId" value={entry.id} />
								<Button
									variant="danger"
									size="sm"
									title="Bekräfta borttagning"
									aria-label="Bekräfta borttagning av anteckning">Bekräfta</Button
								>
							</form>
							<Button variant="subtle" size="sm" type="button" onclick={() => (confirming = null)}
								>Avbryt</Button
							>
						{:else}
							<Button
								variant="danger"
								size="sm"
								type="button"
								title="Ta bort anteckning"
								aria-label="Ta bort anteckning"
								onclick={() => (confirming = entry.id)}>Ta bort</Button
							>
						{/if}
					</span>
				</div>

				{#if entry.body}
					<p class="mt-2.5 text-sm whitespace-pre-wrap text-ink">{entry.body}</p>
				{/if}

				{#if files.length > 0}
					<div class="mt-3 grid gap-1.5">
						{#each files as f (f.id)}
							<a
								href="/anteckningar/fil/{f.id}"
								class="flex flex-wrap items-baseline gap-2 text-sm text-accent-ink hover:underline"
							>
								<span class="min-w-0 break-all">{f.name}</span>
								<span class="text-xs text-dim">{fmtSize(f.size)}</span>
							</a>
						{/each}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
