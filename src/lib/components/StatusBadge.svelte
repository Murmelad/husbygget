<script lang="ts">
	// Status pill with a color dot + Swedish label. Color is never the only carrier —
	// the label always renders (palette rule; see DESIGN.md).
	import { STATUS_LABELS, type SectionStatus } from '$lib/status';

	let { status }: { status: SectionStatus } = $props();

	const styles: Record<SectionStatus, string> = {
		ej_paborjad: 'border border-line-strong bg-panel-2 text-dim',
		pagar: 'bg-pagar-tint text-pagar-ink',
		klar: 'bg-klar-tint text-klar'
	};
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap {styles[
		status
	]}"
>
	<span class="size-[7px] rounded-full bg-current" aria-hidden="true"></span>
	{STATUS_LABELS[status]}
</span>
