<script lang="ts">
	import { getAppState } from '$lib/stores/app.svelte';

	const app = getAppState();

	let isDense = $derived(app.uxConfig.denseBottomBar);
	let paddingTop = $derived(isDense ? 'pt-6' : 'pt-12');
	let paddingBottom = $derived(isDense ? 'pb-2' : 'pb-4');
	let textSize = $derived(isDense ? 'text-[10px]' : 'text-xs');
	let spacing = $derived(isDense ? 'mx-2' : 'mx-4');
</script>

{#snippet footerLink(href: string, label: string)}
	<a
		{href}
		class="uppercase {spacing} {textSize} text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
	>
		{label}
	</a>
{/snippet}

<footer class="w-full">
	<div class="mx-auto flex max-w-7xl items-center justify-center px-4 {paddingTop} {paddingBottom}">
		<div class="flex-1"></div>
		{@render footerLink('/about', 'About')}
		{@render footerLink('/resume', 'Resume')}
		{@render footerLink('/', 'Mellowtech.org')}
		{@render footerLink('/account', 'Account')}
		<div class="flex-1"></div>
	</div>
</footer>
