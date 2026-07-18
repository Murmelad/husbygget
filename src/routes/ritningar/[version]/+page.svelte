<script lang="ts">
	import Details from '$lib/components/Details.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const v = $derived(data.version);

	// Samma pillstil som filterchipsen i Anteckningar.
	const chipBase = 'rounded-full border px-3 py-1 text-xs font-semibold no-underline';
	const chipActive = 'border-accent bg-accent-tint text-accent-ink';
	const chipIdle = 'border-line-strong text-dim';
</script>

<!-- Sidhuvud + versionsundermeny -->
<section
	class="mt-6 rounded-card border border-line bg-panel p-5 shadow-card"
	aria-label="Ritningar"
>
	<span class="eyebrow">Ritningar</span>

	<!-- Versionsundermeny: liten pillrad, nyast först (manifestordning) -->
	<nav class="mt-3 flex flex-wrap gap-2" aria-label="Versioner">
		{#each data.versioner as ver (ver.version)}
			<a
				href="/ritningar/{ver.version}"
				aria-current={ver.version === v.version ? 'page' : undefined}
				class="{chipBase} {ver.version === v.version ? chipActive : chipIdle}"
			>
				v{ver.version}
			</a>
		{/each}
	</nav>

	<!-- Versionsmeta -->
	<p class="eyebrow mt-4">Version {v.version} · {v.datum}</p>
	<h1 class="mt-1 font-display text-xl font-bold text-ink">{v.titel}</h1>
	<p class="mt-2 text-sm text-dim">{v.beskrivning}</p>

	<Details class="group mt-4">
		{#snippet summary()}
			<div class="flex items-center justify-between gap-3 px-4 py-3">
				<span class="text-sm font-semibold text-ink">Ändringar i denna version</span>
				<span class="shrink-0 text-dim" aria-hidden="true">
					<span class="group-[[open]]:hidden">▾</span>
					<span class="hidden group-[[open]]:inline">▴</span>
				</span>
			</div>
		{/snippet}
		<ul class="grid list-disc gap-1.5 py-3 pr-4 pl-9 text-[13.5px] text-dim">
			{#each v.andringar as andring (andring)}
				<li>{andring}</li>
			{/each}
		</ul>
	</Details>
</section>

<!-- Bladen: ett kort per ritningsblad -->
<div class="mt-6 grid gap-5">
	{#each v.blad as blad (blad.fil)}
		<figure class="rounded-card border border-line bg-panel p-4 shadow-card">
			<figcaption class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
				<h2 class="font-display text-[15px] font-semibold text-ink">{blad.titel}</h2>
				<a
					href="/ritningar/v{v.version}/{blad.fil}"
					target="_blank"
					rel="noopener"
					class="text-[13px] text-accent-ink hover:underline"
				>
					Öppna i full storlek
				</a>
			</figcaption>
			<!-- SVG:erna bär egen vit pappersbakgrund, så ingen bg här. Hårlinjeram = bladkant. -->
			<img
				src="/ritningar/v{v.version}/{blad.fil}"
				alt={blad.titel}
				loading="lazy"
				class="mt-3 block w-full rounded-ctl border border-line"
			/>
		</figure>
	{/each}
</div>
