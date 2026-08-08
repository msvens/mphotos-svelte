<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { guestsService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import { getToastState } from '$lib/stores/toast.svelte';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import GuestSignInDialog from '$lib/components/guest/GuestSignInDialog.svelte';
	import GuestProfileDialog from '$lib/components/guest/GuestProfileDialog.svelte';
	import GuestAvatar from '$lib/components/guest/GuestAvatar.svelte';

	const app = getAppState();
	const toast = getToastState();

	// The signup verification email links here as `/guest?code=<token>`.
	let code = $derived(page.url.searchParams.get('code') ?? '');

	let verifying = $state(false);
	let verifyFailed = $state(false);
	let justVerified = $state(false);
	let showSignIn = $state(false);
	let showProfile = $state(false);

	// The avatar file is overwritten at the same URL, so bump this after a change to force the
	// <img> to refetch instead of showing the cached one.
	let avatarVersion = $state(0);
	let avatarInput = $state<HTMLInputElement>();
	let avatarBusy = $state(false);

	async function changeAvatar(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (avatarInput) avatarInput.value = '';
		if (!file) return;
		avatarBusy = true;
		try {
			await guestsService.uploadAvatar(file);
			await app.refreshGuest();
			avatarVersion++;
			toast.success('Avatar updated');
		} catch (e) {
			console.error('Error uploading avatar:', e);
			toast.error('Failed to update avatar');
		} finally {
			avatarBusy = false;
		}
	}

	async function removeAvatar() {
		avatarBusy = true;
		try {
			await guestsService.removeAvatar();
			await app.refreshGuest();
			avatarVersion++;
			toast.success('Avatar removed');
		} catch (e) {
			console.error('Error removing avatar:', e);
			toast.error('Failed to remove avatar');
		} finally {
			avatarBusy = false;
		}
	}

	onMount(async () => {
		if (!code) return;
		verifying = true;
		try {
			await guestsService.verifyGuest(code);
			justVerified = true;
			await app.refreshGuest(); // pick up the verified guest + the cookie the server set
		} catch (e) {
			console.error('Error verifying guest:', e);
			verifyFailed = true;
		} finally {
			verifying = false;
		}
	});

	async function closeSignIn(signedIn?: boolean) {
		showSignIn = false;
		if (signedIn) await app.refreshGuest();
	}

	async function closeProfile(updated?: boolean) {
		showProfile = false;
		if (updated) await app.refreshGuest();
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
			{justVerified
				? `Thank you for verifying, ${app.guest.name}!`
				: `Welcome back, ${app.guest.name}!`}
		</h1>
		<div class="space-y-1 text-gray-900 dark:text-white">
			<p>You are signed in as <strong>{app.guest.name}</strong> ({app.guest.email}).</p>
			{#if app.guest.fullName}
				<p class="text-sm text-gray-600 dark:text-gray-400">{app.guest.fullName}</p>
			{/if}
			{#if app.guest.description}
				<p class="text-sm text-gray-600 dark:text-gray-400">{app.guest.description}</p>
			{/if}
		</div>
		<p class="text-sm text-gray-600 dark:text-gray-400">
			You can <a class="underline" href="/photo">like and comment on photos</a>.
		</p>

		<div class="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">
			<h3 class="text-lg font-medium text-gray-900 dark:text-white">Manage your guest account</h3>

			<div class="flex items-center gap-4">
				<GuestAvatar
					guestId={app.guest.guestId}
					avatar={app.guest.avatar}
					name={app.guest.name}
					size={192}
					version={avatarVersion}
					class="h-24 w-24"
				/>
				<input
					bind:this={avatarInput}
					type="file"
					accept="image/jpeg,image/png"
					onchange={changeAvatar}
					class="hidden"
				/>
				<div class="flex gap-3">
					<Button onclick={() => avatarInput?.click()} variant="outlined" disabled={avatarBusy}>
						{app.guest.avatar ? 'CHANGE PICTURE' : 'ADD PICTURE'}
					</Button>
					{#if app.guest.avatar}
						<Button onclick={removeAvatar} variant="outlined" disabled={avatarBusy}>REMOVE</Button>
					{/if}
				</div>
			</div>

			<div class="flex gap-3">
				<Button onclick={() => (showProfile = true)}>UPDATE PROFILE</Button>
				<Button onclick={handleLogout} variant="outlined">LOGOUT</Button>
			</div>
		</div>
	{:else}
		<h1 class="text-2xl font-light">Guest access</h1>
		{#if verifyFailed}
			<p class="text-sm text-red-500">
				That verification link is invalid or has expired. Sign up again, or log in if your account
				is already verified.
			</p>
		{/if}
		<p class="text-gray-900 dark:text-white">
			Sign in to like and comment on photos. Returning guests log in with a code we email; new
			guests register with a nickname and email.
		</p>
		<Button onclick={() => (showSignIn = true)}>SIGN IN</Button>
	{/if}
</div>

{#if showSignIn}
	<GuestSignInDialog onClose={closeSignIn} />
{/if}

{#if showProfile && app.guest}
	<GuestProfileDialog guest={app.guest} onClose={closeProfile} />
{/if}
