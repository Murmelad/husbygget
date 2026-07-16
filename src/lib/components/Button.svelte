<script lang="ts">
	// Shared button/link primitive — the canonical action styles. Renders an <a> when
	// `href` is set, else a <button> (type defaults to 'submit' since mutations are form
	// actions). Use this instead of hand-rolled button classes.
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'danger' | 'subtle';
	type Size = 'sm' | 'md';

	let {
		variant = 'primary',
		size = 'md',
		href = null,
		type = 'submit',
		disabled = false,
		class: klass = '',
		children,
		...rest
	}: {
		variant?: Variant;
		size?: Size;
		href?: string | null;
		type?: 'submit' | 'button' | 'reset';
		disabled?: boolean;
		class?: string;
		children: Snippet;
		[key: string]: unknown;
	} = $props();

	const base =
		'inline-flex items-center justify-center gap-1.5 rounded-ctl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';
	const sizes: Record<Size, string> = { sm: 'px-3 py-1 text-sm', md: 'px-4 py-1.5 text-sm' };
	const variants: Record<Variant, string> = {
		primary: 'bg-accent text-accent-contrast hover:bg-accent-ink',
		secondary: 'border border-line-strong text-ink hover:bg-panel-2',
		danger: 'bg-danger text-white hover:opacity-90',
		subtle: 'text-accent-ink hover:bg-accent-tint'
	};
	const cls = $derived(`${base} ${sizes[size]} ${variants[variant]} ${klass}`);
</script>

{#if href}
	<a {href} class={cls} {...rest}>{@render children()}</a>
{:else}
	<button {type} {disabled} class={cls} {...rest}>{@render children()}</button>
{/if}
