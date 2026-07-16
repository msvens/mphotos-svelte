<script lang="ts">
	import { getAppState } from '$lib/stores/app.svelte';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import SideMenu, { type MenuItem } from '$lib/components/ui/SideMenu.svelte';
	import Login from '$lib/components/account/Login.svelte';
	import Logout from '$lib/components/account/Logout.svelte';
	import Profile from '$lib/components/account/Profile.svelte';

	const app = getAppState();

	const PROFILE = 'profile';
	const GOOGLE_DRIVE = 'googledrive';
	const LOCAL_DRIVE = 'localdrive';
	const UXCONFIG = 'uxconfig';
	const MAINTENANCE = 'maintenance';
	const LOGOUT = 'logout';

	const menuItems: MenuItem[] = [
		{ id: PROFILE, name: 'Profile' },
		{ id: GOOGLE_DRIVE, name: 'Google Drive' },
		{ id: LOCAL_DRIVE, name: 'Local Drive' },
		{ id: UXCONFIG, name: 'UX Config' },
		{ id: MAINTENANCE, name: 'Maintenance' },
		{ id: LOGOUT, name: 'Logout' }
	];

	let active = $state(PROFILE);
</script>

<PageSpacing />

{#if app.loading}
	<div class="flex min-h-[calc(100vh-200px)] items-center justify-center">
		<div class="text-center">
			<div
				class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900 dark:border-white"
			></div>
			<p class="text-gray-600 dark:text-gray-400">Loading...</p>
		</div>
	</div>
{:else if !app.isUser}
	<Login />
{:else}
	<div class="flex flex-col sm:flex-row">
		<SideMenu items={menuItems} activeItem={active} onItemChange={(id) => (active = id)} />

		<div class="flex-1 pl-4 pr-8">
			{#if active === PROFILE}
				<Profile />
			{:else if active === LOGOUT}
				<Logout />
			{:else}
				{@const label = menuItems.find((m) => m.id === active)?.name ?? active}
				<div class="space-y-4">
					<h1 class="text-2xl font-light">{label}</h1>
					<p class="text-gray-600 dark:text-gray-400">This section has not been migrated yet.</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
