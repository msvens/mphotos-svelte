<script lang="ts">
	import type { Snippet } from 'svelte';
	import Divider from '$lib/components/ui/Divider.svelte';

	type SectionSpacing = 'sm' | 'md' | 'lg' | 'xl';

	interface SectionProps {
		children: Snippet;
		class?: string;
		spacing?: SectionSpacing;
		showDivider?: boolean;
	}

	let { children, class: cls = '', spacing = 'md', showDivider = false }: SectionProps = $props();

	// Written out rather than interpolated so Tailwind's scanner can see each class.
	const spacingClasses: Record<SectionSpacing, string> = {
		sm: 'mb-4', // 1rem (16px)
		md: 'mb-8', // 2rem (32px)
		lg: 'mb-12', // 3rem (48px)
		xl: 'mb-16' // 4rem (64px)
	};

	// The divider's top margin matches the section's bottom spacing. Tailwind units.
	const dividerSpacing: Record<SectionSpacing, number> = { sm: 4, md: 8, lg: 12, xl: 16 };
</script>

<div class="w-full {spacingClasses[spacing]} {cls}">
	{@render children()}
	{#if showDivider}
		<Divider spacing={{ top: dividerSpacing[spacing], bottom: 0 }} />
	{/if}
</div>
