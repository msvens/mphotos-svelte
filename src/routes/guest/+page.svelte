<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { guestsService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import { getToastState } from '$lib/stores/toast.svelte';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import RegisterGuestDialog from '$lib/components/guest/RegisterGuestDialog.svelte';

	const app = getAppState();
	const toast = getToastState();

	// The verification email links here as `/guest?code=<guest-uuid>`.
	let code = $derived(page.url.searchParams.get('code') ?? '');

	let verifying = $state(false);
	let justVerified = $state(false);
	let showDialog = $state(false);
	let isUpdate = $state(false);

	onMount(async () => {
		if (!code) return;
		verifying = true;
		try {
			const g = await guestsService.verifyGuest(code);
			justVerified = g.verified;
			await app.refreshGuest(); // pick up the verified flag + the (re)set cookie
			if (!g.verified) toast.error('Verification failed — the link may be invalid or expired');
		} catch (e) {
			console.error('Error verifying guest:', e);
			toast.error('Failed to verify guest');
		} finally {
			verifying = false;
		}
	});

	function openRegister() {
		isUpdate = false;
		showDialog = true;
	}

	function openUpdate() {
		isUpdate = true;
		showDialog = true;
	}

	async function closeDialog() {
		showDialog = false;
		// Register/update may have changed guest state — registering sets the cookie server-side,
		// so this flips the page to the profile view.
		await app.refreshGuest();
	}

	async function handleLogout() {
		await app.logoutGuest();
		toast.success('Logged out');
	}
</script>

<PageSpacing />

<div class="mx-auto max-w-[720px] space-y-6">
	{#if verifying}
		<p class="text-gray-600 dark:text-gray-400">Verifying…</p>
	{:else if app.isGuest && app.guest}
		<h1 class="text-2xl font-light">
			{code && justVerified
				? `Thank you for verifying, ${app.guest.name}!`
				: `Welcome back, ${app.guest.name}!`}
		</h1>
		<p class="text-gray-900 dark:text-white">
			You are registered as <strong>{app.guest.name}</strong> ({app.guest.email}).
		</p>
		{#if !app.guest.verified}
			<p class="text-sm text-gray-600 dark:text-gray-400">
				Your email isn't verified yet — check your inbox for the verification link.
			</p>
		{/if}
		<p class="text-sm text-gray-600 dark:text-gray-400">
			You can now <a class="underline" href="/photo">like and comment on photos</a>.
		</p>

		<div class="space-y-3 border-t border-gray-200 pt-6 dark:border-gray-700">
			<h3 class="text-lg font-medium text-gray-900 dark:text-white">Manage your guest account</h3>
			<div class="flex gap-3">
				<Button onclick={openUpdate}>UPDATE GUEST</Button>
				<Button onclick={handleLogout} variant="outlined">LOGOUT GUEST</Button>
			</div>
		</div>
	{:else}
		<h1 class="text-2xl font-light">Register Guest</h1>
		<p class="text-gray-900 dark:text-white">
			Register with a nickname and your email to like and comment on photos. We'll send a
			verification email to confirm your address.
		</p>
		<Button onclick={openRegister}>REGISTER / LOGIN</Button>
	{/if}
</div>

{#if showDialog}
	<RegisterGuestDialog
		onClose={closeDialog}
		{isUpdate}
		initialName={app.guest?.name ?? ''}
		initialEmail={app.guest?.email ?? ''}
	/>
{/if}
