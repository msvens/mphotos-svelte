<script module lang="ts">
	export type TooltipPlacement =
		'top' | 'bottom' | 'left' | 'right' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
</script>

<script lang="ts">
	import { onDestroy, type Snippet } from 'svelte';

	interface TooltipProps {
		children: Snippet;
		title: string;
		placement?: TooltipPlacement;
		/** Delay in ms before the tooltip appears on hover/focus. */
		delay?: number;
	}

	let { children, title, placement = 'right', delay = 1000 }: TooltipProps = $props();

	const GAP = 4;

	let trigger: HTMLDivElement;
	let bubble = $state<HTMLDivElement | null>(null);
	let visible = $state(false);
	let pos = $state<{ top?: number; left?: number; right?: number } | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function show() {
		clearTimeout(timer);
		if (delay <= 0) {
			visible = true;
			return;
		}
		timer = setTimeout(() => (visible = true), delay);
	}

	function hide() {
		clearTimeout(timer);
		visible = false;
		pos = null;
	}

	onDestroy(() => clearTimeout(timer));

	const MARGIN = 8; // keep this far from the viewport edge

	const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

	// Position the bubble once it is in the DOM, using its measured size so short
	// labels stay centered and the offset is accurate regardless of trigger size.
	// Centered placements are clamped to the viewport so icons near an edge shift
	// on-screen automatically instead of overflowing.
	$effect(() => {
		if (!visible || !bubble || !trigger) return;
		const r = trigger.getBoundingClientRect();
		const w = bubble.offsetWidth;
		const h = bubble.offsetHeight;
		const maxLeft = window.innerWidth - w - MARGIN;
		const maxTop = window.innerHeight - h - MARGIN;

		switch (placement) {
			case 'top':
				pos = { top: r.top - h - GAP, left: clamp(r.left + (r.width - w) / 2, MARGIN, maxLeft) };
				break;
			case 'bottom':
				pos = { top: r.bottom + GAP, left: clamp(r.left + (r.width - w) / 2, MARGIN, maxLeft) };
				break;
			case 'left':
				pos = { top: clamp(r.top + (r.height - h) / 2, MARGIN, maxTop), left: r.left - w - GAP };
				break;
			case 'right':
				pos = { top: clamp(r.top + (r.height - h) / 2, MARGIN, maxTop), left: r.right + GAP };
				break;
			case 'bottom-left':
				pos = { top: r.bottom + GAP, right: window.innerWidth - r.right };
				break;
			case 'bottom-right':
				pos = { top: r.bottom + GAP, left: r.left };
				break;
			case 'top-left':
				pos = { top: r.top - h - GAP, right: window.innerWidth - r.right };
				break;
			case 'top-right':
				pos = { top: r.top - h - GAP, left: r.left };
				break;
		}
	});

	let style = $derived(
		pos
			? [
					pos.top !== undefined ? `top: ${pos.top}px` : '',
					pos.left !== undefined ? `left: ${pos.left}px` : '',
					pos.right !== undefined ? `right: ${pos.right}px` : ''
				]
					.filter(Boolean)
					.join('; ')
			: ''
	);
</script>

<!-- Decorative hover/focus wrapper around an already-interactive child (e.g. a button);
	 the tooltip bubble below carries role="tooltip". -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={trigger}
	onmouseenter={show}
	onmouseleave={hide}
	onfocusin={show}
	onfocusout={hide}
	class="inline-block"
>
	{@render children()}
</div>

{#if visible && title}
	<!-- Rendered (to measure) but invisible until positioned, to avoid a first-frame flash. -->
	<div
		bind:this={bubble}
		role="tooltip"
		class="pointer-events-none fixed z-[9999] whitespace-nowrap rounded bg-[#616161] px-2 py-1 text-xs text-white shadow-lg transition-opacity duration-75 {pos
			? 'opacity-100'
			: 'opacity-0'}"
		{style}
	>
		{title}
	</div>
{/if}
