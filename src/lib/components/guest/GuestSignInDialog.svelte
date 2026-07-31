<!--
	Guest sign-in: log in (email → 6-digit code) or sign up (email + nickname + optional
	full name / description → emailed verification link). Mount behind an `{#if}` so a fresh
	instance per open resets the state. `onClose(true)` means the guest is now signed in.
-->
<script lang="ts">
	import { guestsService } from '$lib/api/services';
	import { ApiError } from '$lib/api/client';
	import type { Guest } from '$lib/api/types';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface GuestSignInDialogProps {
		onClose: (signedIn?: boolean) => void;
	}

	let { onClose }: GuestSignInDialogProps = $props();

	let mode = $state<'login' | 'signup'>('login');
	let email = $state('');
	let name = $state('');
	let fullName = $state('');
	let description = $state('');
	let code = $state('');
	let codeSent = $state(false);
	let loginMessage = $state('');
	let registered = $state<Guest | null>(null);
	let error = $state<string | null>(null);
	let busy = $state(false);

	function errMsg(e: unknown): string {
		if (e instanceof ApiError || e instanceof Error) return e.message;
		return 'Something went wrong';
	}

	function switchMode(to: 'login' | 'signup') {
		mode = to;
		error = null;
		codeSent = false;
		code = '';
		loginMessage = '';
	}

	async function sendCode() {
		error = null;
		busy = true;
		try {
			loginMessage = (await guestsService.loginGuest(email)).message;
			codeSent = true;
		} catch (e) {
			error = errMsg(e);
		} finally {
			busy = false;
		}
	}

	async function verifyCode() {
		error = null;
		busy = true;
		try {
			await guestsService.loginVerifyGuest(email, code);
			onClose(true);
		} catch (e) {
			error = errMsg(e); // "invalid email or code"
		} finally {
			busy = false;
		}
	}

	async function signup() {
		error = null;
		busy = true;
		try {
			registered = await guestsService.registerGuest({ email, name, fullName, description });
		} catch (e) {
			error = errMsg(e); // may be "an account with this email already exists — please log in"
		} finally {
			busy = false;
		}
	}
</script>

{#if registered}
	<Dialog open onClose={() => onClose()} title="Check your email" closeText="OK">
		<div class="space-y-3 text-gray-900 dark:text-gray-100">
			<p>Thanks for signing up, {registered.name}!</p>
			<p>
				We've sent a verification link to <strong>{registered.email}</strong>. Click it to activate
				your account and sign in.
			</p>
		</div>
	</Dialog>
{:else}
	<Dialog open onClose={() => onClose()} title={mode === 'login' ? 'Log in' : 'Sign up'}>
		<div class="space-y-4">
			{#if mode === 'login'}
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Enter your email and we'll send you a 6-digit login code.
				</p>
				<TextField label="Email" type="email" bind:value={email} fullWidth disabled={codeSent} />
				{#if codeSent}
					<p class="text-sm text-gray-600 dark:text-gray-400">{loginMessage}</p>
					<TextField
						label="6-digit code"
						bind:value={code}
						fullWidth
						inputmode="numeric"
						maxlength={6}
					/>
				{/if}
			{:else}
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Register to like and comment on photos. We'll email a link to verify your address.
				</p>
				<TextField label="Email" type="email" bind:value={email} fullWidth />
				<TextField label="Nickname" bind:value={name} fullWidth />
				<TextField label="Full name (optional)" bind:value={fullName} fullWidth />
				<TextField label="About you (optional)" bind:value={description} fullWidth />
			{/if}

			{#if error}
				<p class="text-sm text-red-500">{error}</p>
			{/if}

			<button
				type="button"
				class="text-sm text-blue-600 hover:underline dark:text-blue-400"
				onclick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
			>
				{mode === 'login' ? 'New here? Sign up' : 'Already registered? Log in'}
			</button>
		</div>

		{#snippet actions()}
			<Button variant="outlined" onclick={() => onClose()}>CANCEL</Button>
			{#if mode === 'login'}
				{#if codeSent}
					<Button onclick={verifyCode} disabled={busy || !code}>
						{busy ? 'SIGNING IN...' : 'LOG IN'}
					</Button>
				{:else}
					<Button onclick={sendCode} disabled={busy || !email}>
						{busy ? 'SENDING...' : 'SEND CODE'}
					</Button>
				{/if}
			{:else}
				<Button onclick={signup} disabled={busy || !email || !name}>
					{busy ? 'SIGNING UP...' : 'SIGN UP'}
				</Button>
			{/if}
		{/snippet}
	</Dialog>
{/if}
