<script lang="ts">
	import { Icon, type IconSource } from 'svelte-hero-icons';
	import Tooltip, { type TooltipPlacement } from './Tooltip.svelte';

	type IconButtonSize = 'small' | 'medium' | 'large' | 'nav';

	interface IconButtonProps {
		icon: IconSource;
		onclick?: () => void;
		size?: IconButtonSize;
		disabled?: boolean;
		title?: string;
		tooltipPlacement?: TooltipPlacement;
		/**
		 * Accessible name. Defaults to `title`; set it for controls that need a name but
		 * no tooltip, since the icon alone leaves the button unlabelled.
		 */
		ariaLabel?: string;
		class?: string;
		iconClass?: string;
		background?: string; // Optional background color (e.g., 'rgba(0,0,0,0.5)')
	}

	let {
		icon,
		onclick,
		size = 'medium',
		disabled = false,
		title,
		tooltipPlacement,
		ariaLabel,
		class: cls = '',
		iconClass = '',
		background
	}: IconButtonProps = $props();

	const sizeClasses: Record<IconButtonSize, { button: string; icon: string }> = {
		small: { button: 'w-8 h-8', icon: 'w-4 h-4' },
		medium: { button: 'w-10 h-10', icon: 'w-6 h-6' },
		large: { button: 'w-16 h-16', icon: 'w-8 h-8 stroke-[1.25]' },
		nav: { button: 'w-12 h-12', icon: 'w-8 h-8 stroke-[1.5]' }
	};

	let buttonSize = $derived(sizeClasses[size].button);
	let iconSize = $derived(sizeClasses[size].icon);

	// With a background, hover uses a brightness filter; otherwise a bg color change.
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
		aria-label={ariaLabel ?? title}
		style={background ? `background-color: ${background}` : undefined}
		class={`flex items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50 ${hoverClasses} transition-all duration-150 ${buttonSize} ${cls}`}
	>
		<Icon src={icon} class={`${iconSize} ${iconClass}`} />
	</button>
{/snippet}

{#if title}
	<Tooltip {title} placement={tooltipPlacement}>{@render button()}</Tooltip>
{:else}
	{@render button()}
{/if}
