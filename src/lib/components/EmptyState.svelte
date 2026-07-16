<script lang="ts">
	// "Nothing here yet" block — dashed, centered, muted. Message + CTA go in children.
	import type { Snippet } from 'svelte';

	let { class: klass = 'mt-6', children }: { class?: string; children: Snippet } = $props();
</script>

<div
	class="{klass} rounded-card border border-dashed border-line-strong px-4 py-10 text-center text-sm text-dim"
>
	{@render children()}
</div>
