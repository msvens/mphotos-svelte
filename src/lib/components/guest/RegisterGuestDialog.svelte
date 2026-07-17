<!--
	Register (or update) a guest so they can like and comment.

	Mount it behind an `{#if}` rather than passing an `open` prop: a fresh instance per
	open re-runs the state initialisers, which *is* the reset. That replaces two React
	workarounds — a render-phase `wasOpen` diff, and a `setTimeout(…, 300)` deferred reset
	that existed to outlast a modal fade our Dialog doesn't have.

	Registration completes via an emailed verification link, which lands on /guest — still
	a stub, so a brand-new guest currently dead-ends there.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { guestsService } from '$lib/api/services';
	import type { Guest } from '$lib/api/types';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';

	interface RegisterGuestDialogProps {
		onClose: () => void;
		isUpdate?: boolean;
		initialName?: string;
		initialEmail?: string;
	}

	let {
		onClose,
		isUpdate = false,
		initialName = '',
		initialEmail = ''
	}: RegisterGuestDialogProps = $props();

	// Seeds, deliberately: the fields are the user's to edit from here. `untrack` says so
	// out loud — a later change to the props should not overwrite what they've typed.
	// Reopening mounts a fresh instance, which is what re-seeds them.
	let name = $state(untrack(() => initialName));
	let email = $state(untrack(() => initialEmail));
	let registered = $state<Guest | null>(null);
	let error = $state<string | null>(null);

	async function handleRegister() {
		error = null;
		try {
			const params = { name, email };
			registered = isUpdate
				? await guestsService.updateGuest(params)
				: await guestsService.registerGuest(params);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error occurred';
			// Reset to initial values on error
			if (initialEmail) email = initialEmail;
			if (initialName) name = initialName;
		}
	}
</script>

{#if registered && isUpdate}
	<Dialog open onClose={() => onClose()} title="Guest Updated" closeText="Ok">
		<p class="text-gray-900 dark:text-gray-100">
			Your guest information has been updated successfully. Your new name is
			<strong>{registered.name}</strong>.
		</p>
	</Dialog>
{:else if registered}
	<Dialog open onClose={() => onClose()} title="Check Your Email" closeText="Ok">
		<div class="space-y-3">
			<p class="font-medium text-gray-900 dark:text-gray-100">
				Thank you for registering, {registered.name}!
			</p>
			<p class="text-gray-900 dark:text-gray-100">
				We&apos;ve sent a verification email to <strong>{registered.email}</strong>.
			</p>
			<p class="text-gray-900 dark:text-gray-100">
				Please check your email and click the verification link to complete your registration.
			</p>
		</div>
	</Dialog>
{:else if error}
	<!-- Dismissing the error falls back to the form rather than closing. -->
	<Dialog open onClose={() => (error = null)} title="Error" closeText="Close">
		<p class="text-gray-900 dark:text-gray-100">{error}</p>
	</Dialog>
{:else}
	<Dialog
		open
		onClose={() => onClose()}
		onOk={handleRegister}
		title={isUpdate ? 'Update User' : 'Register User'}
		okText="OK"
		closeText="CANCEL"
		closeOnOk={false}
	>
		<p class="mb-4 text-gray-600 dark:text-gray-400">
			In order to be able to comment and like photos you need to register as a guest by providing a
			unique nickname and your email address.
			{isUpdate
				? 'To update your guest information, modify the fields below.'
				: 'You will receive a verification email.'}
		</p>
		<div class="space-y-4">
			<TextField label="Name" bind:value={name} fullWidth />
			<TextField label="Email" type="email" bind:value={email} fullWidth disabled={isUpdate} />
		</div>
	</Dialog>
{/if}
