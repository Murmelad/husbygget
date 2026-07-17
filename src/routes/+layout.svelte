<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { children } = $props();

	const nav = [
		{ href: '/', label: 'Översikt' },
		{ href: '/anteckningar', label: 'Anteckningar' },
		{ href: '/installningar', label: 'Inställningar' }
	];

	function isActive(href: string): boolean {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<title>Husbygget</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-5">
	<header class="flex items-baseline gap-6 border-b-2 border-ink pt-[22px] pb-3.5">
		<a
			href="/"
			class="flex items-center gap-2.5 font-display text-[22px] font-bold tracking-[0.14em] text-ink uppercase no-underline"
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
			<span>Husby<span class="text-accent">gg</span>et</span>
		</a>
		<nav class="ml-auto flex gap-[18px]">
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
		<ThemeToggle />
	</header>
</div>

<main class="mx-auto max-w-3xl px-5 pb-16">
	{@render children()}
</main>
