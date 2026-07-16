// SEK formatting — whole kronor, sv-SE grouping (narrow no-break thousands space).
// Pair with the `.money` utility class (tabular-nums) wherever amounts line up.

const nf = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 });

export function formatSEK(amount: number): string {
	return `${nf.format(amount)} kr`;
}

/** "6,0 mkr" style shorthand for axis/scale labels. */
export function formatMkr(amount: number): string {
	return `${(amount / 1_000_000).toLocaleString('sv-SE', { maximumFractionDigits: 1 })} mkr`;
}
