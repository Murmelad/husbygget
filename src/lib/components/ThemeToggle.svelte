<script lang="ts">
	// Light/dark override toggle. The EFFECTIVE theme is whatever the CSS resolved
	// (prefers-color-scheme or a data-theme override), read via the --when-dark token —
	// so this component needs no state and the ☀/☾ icon swap is pure CSS. The choice is
	// stamped on <html> (wins over the media query) and persisted in localStorage,
	// re-applied pre-paint by the head script in app.html. Without JS the system theme
	// simply applies.
	function toggle() {
		const isDark =
			getComputedStyle(document.documentElement).getPropertyValue('--when-dark').trim() ===
			'inline';
		const next = isDark ? 'light' : 'dark';
		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem('theme', next);
		} catch {
			// private mode etc. — the override still applies for this page view
		}
	}
</script>

<button
	type="button"
	onclick={toggle}
	title="Växla ljust/mörkt läge"
	aria-label="Växla ljust/mörkt läge"
	class="grid size-8 place-items-center rounded-ctl border border-line-strong text-base text-dim transition hover:bg-panel-2 hover:text-ink"
>
	<span style="display: var(--when-light)" aria-hidden="true">☾</span>
	<span style="display: var(--when-dark)" aria-hidden="true">☀</span>
</button>
