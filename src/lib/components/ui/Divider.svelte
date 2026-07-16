<script lang="ts">
	interface DividerProps {
		class?: string;
		spacing?: { top?: number; bottom?: number };
	}

	let { class: cls = '', spacing = { top: 8, bottom: 8 } }: DividerProps = $props();

	// spacing is in Tailwind units (1 = 0.25rem); resolve to inline margins so the
	// classes don't have to be statically present for Tailwind's scanner.
	let topRem = $derived((spacing.top ?? 8) * 0.25);
	let bottomRem = $derived((spacing.bottom ?? 8) * 0.25);
</script>

<hr
	class="border-gray-200 dark:border-gray-700 {cls}"
	style="margin-top: {topRem}rem; margin-bottom: {bottomRem}rem"
/>
