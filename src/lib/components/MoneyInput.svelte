<script lang="ts">
	// SEK amount input that formats with sv-SE thousand grouping while typing —
	// same presentation as formatSEK() on the view pages. Submits the formatted
	// string; the server's intOf() strips whitespace before parsing. Without JS it
	// degrades to a plain numeric text field.
	let {
		name,
		id,
		value = null,
		required = false,
		placeholder = '',
		class: klass = ''
	}: {
		name: string;
		id?: string;
		value?: number | null;
		required?: boolean;
		placeholder?: string;
		class?: string;
	} = $props();

	const nf = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 });
	let text = $state(value != null ? nf.format(value) : '');

	function oninput(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		const digits = el.value.replace(/\D/g, '');
		text = digits ? nf.format(Number(digits)) : '';
		el.value = text; // caret moves to end — fine for amounts
	}
</script>

<input
	{id}
	{name}
	{required}
	{placeholder}
	type="text"
	inputmode="numeric"
	autocomplete="off"
	value={text}
	{oninput}
	class="money {klass}"
/>
