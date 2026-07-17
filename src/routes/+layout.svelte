<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { children } = $props();

	const nav = [
		{ href: '/', label: 'Översikt' },
		{ href: '/dagbok', label: 'Dagbok' },
		{ href: '/installningar', label: 'Inställningar' }
	];

	function isActive(href: string): boolean {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}
</script>

<div class="mx-auto max-w-3xl px-5">
	<header class="flex items-baseline gap-6 border-b-2 border-ink pt-[22px] pb-3.5">
		<a
			href="/"
			class="font-display text-[22px] font-bold tracking-[0.14em] text-ink uppercase no-underline"
		>
			Husby<span class="text-accent">gg</span>et
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
