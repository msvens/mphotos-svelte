<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { getAppState } from '$lib/stores/app.svelte';
	import { authService, type AuthMethod } from '$lib/api/services';
	import { API_ENDPOINTS } from '$lib/api/config';
	import Divider from '$lib/components/ui/Divider.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	const app = getAppState();

	const OAUTH_ERROR_MESSAGES: Record<string, string> = {
		unauthorized_email: 'This Google account is not authorized for this site.',
		invalid_state: 'Login session expired. Please try again.',
		exchange_failed: 'Could not complete sign-in with Google. Please try again.'
	};

	let status = $state<'loading' | 'ready' | 'failed'>('loading');
	let authMethod = $state<AuthMethod | null>(null);
	let oauthError = $state('');

	let password = $state('');
	let submitting = $state(false);
	let loginError = $state('');

	onMount(async () => {
		const errorParam = page.url.searchParams.get('error');
		if (errorParam) {
			oauthError = OAUTH_ERROR_MESSAGES[errorParam] ?? 'Sign-in failed. Please try again.';
			replaceState('/account', {}); // strip the ?error= param
		}

		try {
			authMethod = await authService.getAuthMethod();
			status = 'ready';
		} catch {
			status = 'failed';
		}
	});

	async function handleLogin() {
		if (!password.trim()) return;
		submitting = true;
		loginError = '';
		try {
			await app.login(password);
		} catch {
			loginError = 'Incorrect password';
		} finally {
			submitting = false;
		}
	}

	function onPasswordInput() {
		if (loginError) loginError = '';
	}

	function handleGoogleLogin() {
		// Full-page navigation is required for OAuth — never use fetch/XHR here.
		window.location.href = API_ENDPOINTS.loginGoogle;
	}
</script>

<div class="mx-auto max-w-md space-y-8">
	<div class="text-center">
		<h1 class="mb-4 text-2xl font-light">Login</h1>
		<p class="text-gray-600 dark:text-gray-400">Login to edit settings</p>
	</div>

	<Divider />

	<div class="space-y-6">
		{#if oauthError}
			<div class="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
				<p class="text-sm text-red-500">{oauthError}</p>
			</div>
		{/if}

		{#if status === 'loading'}
			<div class="py-4 text-center">
				<div
					class="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900 dark:border-white"
				></div>
				<p class="text-sm text-gray-600 dark:text-gray-400">Loading…</p>
			</div>
		{:else if status === 'failed'}
			<div class="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
				<p class="text-sm text-red-500">
					Unable to determine login method. Please reload the page or contact the administrator.
				</p>
			</div>
		{:else if authMethod === 'password'}
			{#if loginError}
				<div class="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
					<p class="text-sm text-red-500">{loginError}</p>
				</div>
			{/if}

			<div>
				<label
					for="login-password"
					class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
				>
					Password
				</label>
				<input
					id="login-password"
					type="password"
					bind:value={password}
					oninput={onPasswordInput}
					onkeypress={(e) => e.key === 'Enter' && handleLogin()}
					class="w-full rounded-lg border border-gray-200 bg-transparent p-3 text-gray-900 placeholder:text-gray-600 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-400"
					placeholder="Enter your password"
					disabled={submitting}
				/>
			</div>

			<Button
				onclick={handleLogin}
				color="primary"
				variant="outlined"
				fullWidth
				disabled={submitting || !password.trim()}
				class="h-12"
			>
				{submitting ? 'Logging in...' : 'Login'}
			</Button>
		{:else if authMethod === 'google'}
			<Button onclick={handleGoogleLogin} color="primary" variant="outlined" fullWidth class="h-12">
				Sign in with Google
			</Button>
		{/if}
	</div>
</div>
