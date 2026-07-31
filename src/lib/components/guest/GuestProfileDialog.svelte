<!--
	Edit a signed-in guest's profile (nickname, full name, description). Email is the login
	identity and is immutable. Mount behind an `{#if}` for the fresh-instance reset.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { guestsService } from '$lib/api/services';
	import type { Guest } from '$lib/api/types';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface GuestProfileDialogProps {
		guest: Guest;
		onClose: (updated?: boolean) => void;
	}

	let { guest, onClose }: GuestProfileDialogProps = $props();

	let name = $state(untrack(() => guest.name));
	let fullName = $state(untrack(() => guest.fullName ?? ''));
	let description = $state(untrack(() => guest.description ?? ''));
	let error = $state<string | null>(null);
	let busy = $state(false);

	async function save() {
		error = null;
		busy = true;
		try {
			await guestsService.updateGuest({ name, fullName, description });
			onClose(true);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
		} finally {
			busy = false;
		}
	}
</script>

<Dialog open onClose={() => onClose()} title="Update profile">
	<div class="space-y-4">
		<TextField label="Email" value={guest.email} fullWidth disabled />
		<TextField label="Nickname" bind:value={name} fullWidth />
		<TextField label="Full name (optional)" bind:value={fullName} fullWidth />
		<TextField label="About you (optional)" bind:value={description} fullWidth />
		{#if error}
			<p class="text-sm text-red-500">{error}</p>
		{/if}
	</div>

	{#snippet actions()}
		<Button variant="outlined" onclick={() => onClose()}>CANCEL</Button>
		<Button onclick={save} disabled={busy || !name}>{busy ? 'SAVING...' : 'SAVE'}</Button>
	{/snippet}
</Dialog>
