<script lang="ts">
	import { getAppState } from '$lib/stores/app.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	const app = getAppState();

	async function handleLogout() {
		try {
			await app.logout();
			// The store clears isUser; the account page swaps back to Login.
		} catch (e) {
			console.error('Logout failed:', e);
		}
	}
</script>

<div class="space-y-8">
	<div class="text-center">
		<h1 class="mb-4 text-2xl font-light">Logout</h1>
		<p class="text-gray-600 dark:text-gray-400">
			Log out {app.user.name}. By logging out you will no longer be able to upload pictures, etc.
		</p>
	</div>

	<div class="text-center">
		<Button onclick={handleLogout} color="warning" variant="outlined" class="h-12 px-8">
			LOGOUT NOW
		</Button>
	</div>
</div>
