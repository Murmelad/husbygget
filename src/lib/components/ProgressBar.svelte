<script lang="ts">
	// Budget meter: accent fill for allocated-within-budget; when over budget the
	// overflow segment renders in faluröd DIAGONAL HATCHING (texture, not color alone)
	// and the bar then represents the allocated total instead of the budget.
	import { formatSEK } from '$lib/money';

	let {
		totalBudget,
		allocated,
		class: klass = ''
	}: { totalBudget: number; allocated: number; class?: string } = $props();

	const over = $derived(allocated > totalBudget);
	const fillPct = $derived(
		over ? (totalBudget / allocated) * 100 : totalBudget > 0 ? (allocated / totalBudget) * 100 : 0
	);
	const pctOfBudget = $derived(totalBudget > 0 ? Math.round((allocated / totalBudget) * 100) : 0);
	const label = $derived(
		over
			? `Över budget: ${formatSEK(allocated)} valt av ${formatSEK(totalBudget)}`
			: `${formatSEK(allocated)} valt av ${formatSEK(totalBudget)} (${pctOfBudget} %)`
	);
</script>

<div class={klass}>
	<div
		class="flex h-3.5 overflow-hidden rounded-full border border-line-strong bg-panel-2"
		role="img"
		aria-label={label}
	>
		<div class="rounded-l-full bg-accent" style="width: {Math.min(fillPct, 100).toFixed(2)}%"></div>
		{#if over}
			<div
				class="bg-danger-tint"
				style="width: {(100 - fillPct).toFixed(2)}%;
					background-image: repeating-linear-gradient(45deg, var(--danger) 0 5px, transparent 5px 9px)"
			></div>
		{/if}
	</div>
	<div class="mt-1 flex justify-between font-mono text-[11px] text-dim">
		<span>0</span>
		<span
			>{over
				? `${formatSEK(allocated - totalBudget)} över budget`
				: `${pctOfBudget} % av budget`}</span
		>
		<span class="money">{formatSEK(over ? allocated : totalBudget)}</span>
	</div>
</div>
