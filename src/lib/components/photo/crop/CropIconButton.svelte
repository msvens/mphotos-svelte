<script module lang="ts">
	export type CropGlyph = 'portrait' | 'landscape' | 'square' | 'free' | 'rotate90' | 'rotate5';
</script>

<script lang="ts">
	import Tooltip, { type TooltipPlacement } from '$lib/components/ui/Tooltip.svelte';

	interface CropIconButtonProps {
		glyph: CropGlyph;
		onclick?: () => void;
		title?: string;
		tooltipPlacement?: TooltipPlacement;
		disabled?: boolean;
		background?: string;
		class?: string;
	}

	let {
		glyph,
		onclick,
		title,
		tooltipPlacement,
		disabled = false,
		background,
		class: cls = ''
	}: CropIconButtonProps = $props();

	// Mirrors IconButton's medium size + hover behaviour so the crop toolbar matches the rest.
	let hoverClasses = $derived(
		background
			? 'hover:brightness-150 active:scale-90'
			: 'hover:bg-gray-300 dark:hover:bg-gray-700 active:bg-gray-400/20 active:scale-90'
	);
</script>

{#snippet button()}
	<button
		type="button"
		{onclick}
		{disabled}
		aria-label={title}
		style={background ? `background-color: ${background}` : undefined}
		class="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 {hoverClasses} {cls}"
	>
		<!-- Custom glyphs — heroicons has no crop/rotate icons. Verbatim from the React CropIcons. -->
		<svg
			class="h-6 w-6"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			{#if glyph === 'portrait'}
				<rect x="7" y="2" width="10" height="20" />
			{:else if glyph === 'landscape'}
				<rect x="2" y="7" width="20" height="10" />
			{:else if glyph === 'square'}
				<rect x="4" y="4" width="16" height="16" />
			{:else if glyph === 'free'}
				<path d="M2 8V2h6M22 8V2h-6M2 16v6h6M22 16v6h-6" />
			{:else if glyph === 'rotate90'}
				<path d="M 20 12 A 8 8 0 1 1 12 4" />
			{:else if glyph === 'rotate5'}
				<path d="M 14.7 4.5 A 8 8 0 1 1 12 4" />
			{/if}
		</svg>
	</button>
{/snippet}

{#if title}
	<Tooltip {title} placement={tooltipPlacement}>{@render button()}</Tooltip>
{:else}
	{@render button()}
{/if}
