<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { children } = $props();

	const nav = [
		{ href: '/', label: 'Översikt' },
		{ href: '/anteckningar', label: 'Anteckningar' },
		{ href: '/installningar', label: 'Inställningar' }
	];

	// Mobile drawer (< sm). Closes on navigation, backdrop click and Escape.
	let menuOpen = $state(false);
	afterNavigate(() => (menuOpen = false));

	function isActive(href: string): boolean {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<title>Husbygget</title>
</svelte:head>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (menuOpen = false)} />

<div class="mx-auto max-w-3xl px-5">
	<header class="flex items-center gap-4 border-b-2 border-ink pt-[22px] pb-3.5">
		<a
			href="/"
			class="flex min-w-0 items-center gap-2.5 font-display text-[22px] font-bold tracking-[0.14em] text-ink uppercase no-underline"
		>
			<!-- Logotypen: helt hus på ren ritningsblå platta (headervarianten) -->
			<svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true" class="shrink-0">
				<rect width="64" height="64" rx="14" fill="#17549c" />
				<path
					d="M 18 46 L 18 29 L 32 15 L 46 29 L 46 46 Z"
					fill="none"
					stroke="#fdfdfb"
					stroke-width="4"
					stroke-linejoin="round"
				/>
				<rect x="28" y="36" width="8" height="10" rx="1.5" fill="#fdfdfb" />
			</svg>
			<span class="truncate">Husby<span class="text-accent">gg</span>et</span>
		</a>

		<!-- Desktop nav -->
		<nav class="ml-auto hidden items-baseline gap-[18px] sm:flex">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					aria-current={isActive(item.href) ? 'page' : undefined}
					class="py-0.5 font-display text-[13.5px] tracking-[0.08em] uppercase no-underline {isActive(
						item.href
					)
						? 'border-b-2 border-accent text-ink'
						: 'text-dim'}"
				>
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="hidden sm:block"><ThemeToggle /></div>

		<!-- Mobile: hamburger -->
		<button
			type="button"
			class="ml-auto grid size-9 shrink-0 place-items-center rounded-ctl border border-line-strong text-ink sm:hidden"
			title="Öppna menyn"
			aria-label="Öppna menyn"
			aria-expanded={menuOpen}
			aria-controls="mobilmeny"
			onclick={() => (menuOpen = true)}
		>
			<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
				<path
					d="M 2 4 H 16 M 2 9 H 16 M 2 14 H 16"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
		</button>
	</header>
</div>

<!-- Mobile drawer + backdrop -->
{#if menuOpen}
	<button
		type="button"
		class="fixed inset-0 z-40 bg-ink/30 sm:hidden"
		aria-label="Stäng menyn"
		onclick={() => (menuOpen = false)}
	></button>
{/if}
<aside
	id="mobilmeny"
	class="fixed inset-y-0 right-0 z-50 flex w-64 flex-col border-l border-line bg-panel shadow-card transition-transform duration-200 motion-reduce:transition-none sm:hidden {menuOpen
		? 'translate-x-0'
		: 'translate-x-full'}"
	aria-hidden={!menuOpen}
>
	<div class="flex items-center justify-between border-b-2 border-ink px-5 pt-[22px] pb-3.5">
		<span class="eyebrow">Meny</span>
		<button
			type="button"
			class="grid size-9 place-items-center rounded-ctl border border-line-strong text-ink"
			title="Stäng menyn"
			aria-label="Stäng menyn"
			onclick={() => (menuOpen = false)}
		>
			<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
				<path
					d="M 3 3 L 13 13 M 13 3 L 3 13"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
		</button>
	</div>
	<nav class="flex flex-col px-3 py-3">
		{#each nav as item (item.href)}
			<a
				href={item.href}
				aria-current={isActive(item.href) ? 'page' : undefined}
				class="rounded-ctl border-l-2 px-3 py-3 font-display text-[15px] tracking-[0.08em] uppercase no-underline {isActive(
					item.href
				)
					? 'border-accent bg-accent-tint text-ink'
					: 'border-transparent text-dim'}"
			>
				{item.label}
			</a>
		{/each}
	</nav>
	<div class="mt-auto flex items-center justify-between border-t border-line px-5 py-4">
		<span class="text-[13px] text-dim">Ljust/mörkt läge</span>
		<ThemeToggle />
	</div>
</aside>

<main class="mx-auto max-w-3xl px-5 pb-16">
	{@render children()}
</main>
