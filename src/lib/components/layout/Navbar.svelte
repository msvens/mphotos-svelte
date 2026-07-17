<script lang="ts">
	import { page } from '$app/state';
	import { Icon, Bars3 } from 'svelte-hero-icons';
	import { getAppState } from '$lib/stores/app.svelte';
	import { navigation, isActiveRoute } from './nav';
	import IconButton from '../ui/IconButton.svelte';
	import Logo from '../ui/Logo.svelte';

	const app = getAppState();

	let menuOpen = $state(false);

	// Dense mode: smaller height and icon size
	let isDense = $derived(app.uxConfig.denseTopBar);
	let navHeight = $derived(isDense ? 'h-10' : 'h-12'); // 40px vs 48px
	// 'nav' (48px) fills the h-12 row exactly; 'medium' (40px) fills the dense h-10 row.
	let iconSize: 'medium' | 'nav' = $derived(isDense ? 'medium' : 'nav');
	let mobileIconSize = $derived(isDense ? 'w-6 h-6' : 'w-8 h-8');
	let paddingY = $derived(isDense ? 'py-1' : 'py-2');
	let logoSize = $derived(isDense ? 'w-8 h-8' : 'w-10 h-10');
</script>

<nav
	class="sticky top-0 z-50 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-dark-bg"
>
	<div class="mx-auto max-w-full px-1 {paddingY}">
		<div class="flex justify-between {navHeight}">
			<!-- App name - left aligned -->
			<div class="flex flex-shrink-0 items-center pl-1">
				<a href="/" class="flex cursor-pointer items-center gap-2">
					<Logo class="{logoSize} flex-shrink-0 text-gray-900 dark:text-white" />
					<div
						class="text-base font-light uppercase leading-tight tracking-widest text-gray-900 dark:text-white"
					>
						<span class="block">Mellowtech</span>
						<span class="block">Photos</span>
					</div>
				</a>
			</div>

			<!-- Navigation icons - right aligned -->
			<div class="flex items-center pr-1">
				<div class="hidden md:flex md:space-x-1">
					{#each navigation as item (item.name)}
						{@const active = isActiveRoute(page.url.pathname, item.href)}
						<a href={item.href} class="inline-flex items-center justify-center">
							<IconButton
								icon={item.icon}
								size={iconSize}
								title={item.name}
								tooltipPlacement="bottom"
								class={active
									? 'text-gray-900 dark:text-white bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
									: 'text-gray-600 dark:text-gray-400 bg-transparent hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}
							/>
							<span class="sr-only">{item.name}</span>
						</a>
					{/each}
				</div>

				<!-- Mobile menu button -->
				<div class="flex items-center md:hidden">
					<IconButton
						icon={Bars3}
						onclick={() => (menuOpen = !menuOpen)}
						ariaLabel="Open menu"
						size={iconSize}
						class="bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
					/>
				</div>
			</div>
		</div>
	</div>

	<!-- Mobile menu overlay -->
	<button
		aria-label="Close menu"
		class="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 {menuOpen
			? 'opacity-100'
			: 'pointer-events-none opacity-0'}"
		onclick={() => (menuOpen = false)}
	></button>

	<!-- Mobile menu -->
	<div
		class="fixed right-0 top-[var(--nav-height)] z-50 h-[calc(100dvh-var(--nav-height))] w-56 border-l border-gray-200 bg-white shadow-lg transition-all duration-200 ease-in-out dark:border-gray-700 dark:bg-dark-bg md:hidden {menuOpen
			? 'translate-x-0 opacity-100'
			: 'pointer-events-none translate-x-4 opacity-0'}"
	>
		<div class="py-2">
			{#each navigation as item (item.name)}
				{@const active = isActiveRoute(page.url.pathname, item.href)}
				<a
					href={item.href}
					onclick={() => (menuOpen = false)}
					class="flex items-center px-4 {isDense ? 'py-2' : 'py-3'} transition-colors {active
						? 'text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800'
						: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'}"
				>
					<Icon src={item.icon} class="{mobileIconSize} stroke-[1.25]" aria-hidden="true" />
					<span class="ml-4 {isDense ? 'text-base' : 'text-lg'} font-light">{item.name}</span>
				</a>
			{/each}
		</div>
	</div>
</nav>
