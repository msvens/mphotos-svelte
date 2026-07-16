<script lang="ts">
	import { getAppState } from '$lib/stores/app.svelte';
	import Button from '../ui/Button.svelte';
	import ProfileIcon from '../ui/ProfileIcon.svelte';

	const app = getAppState();

	let imgError = $state(false);
	let lastPic = $state(app.user.pic);

	// Reset the error state whenever the profile picture changes.
	$effect(() => {
		if (app.user.pic !== lastPic) {
			lastPic = app.user.pic;
			imgError = false;
		}
	});
</script>

<div class="mx-auto w-full">
	<div class="flex flex-wrap items-center justify-center gap-8">
		<div class="flex items-center">
			{#if app.user.pic && !imgError}
				<img
					src={app.user.pic}
					alt={app.user.name}
					onerror={() => (imgError = true)}
					class="h-16 w-16 rounded-full object-cover sm:h-32 sm:w-32"
				/>
			{:else}
				<ProfileIcon class="h-16 w-16 text-gray-400 dark:text-gray-500 sm:h-32 sm:w-32" />
			{/if}
		</div>
		<div class="text-left">
			<h2 class="mb-3 text-lg font-semibold">{app.user.name}</h2>
			<p class="text-sm text-gray-600 dark:text-gray-300">{app.user.bio}</p>
		</div>
		{#if app.isUser}
			<div class="flex items-center">
				<Button variant="outlined" href="/account">Account</Button>
			</div>
		{/if}
	</div>
</div>
