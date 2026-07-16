<script lang="ts">
	// Disclosure card (<details>) — the expand/collapse primitive for decision cards on
	// Översikt and edit panels on Inställningar. Native, no JS. The summary row is a
	// snippet; expanded content renders below a hairline.
	import type { Snippet } from 'svelte';

	let {
		open = false,
		class: klass = '',
		summary,
		children
	}: { open?: boolean; class?: string; summary: Snippet; children: Snippet } = $props();
</script>

<details
	{open}
	class="rounded-card border border-line bg-panel shadow-card [&>summary::-webkit-details-marker]:hidden {klass}"
>
	<summary class="cursor-pointer list-none rounded-card">
		{@render summary()}
	</summary>
	<div class="border-t border-line">
		{@render children()}
	</div>
</details>
