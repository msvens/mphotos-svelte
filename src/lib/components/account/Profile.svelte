<script lang="ts">
	import { getAppState } from '$lib/stores/app.svelte';
	import { getToastState } from '$lib/stores/toast.svelte';
	import { userService } from '$lib/api/services';
	import Divider from '$lib/components/ui/Divider.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ProfileIcon from '$lib/components/ui/ProfileIcon.svelte';

	const app = getAppState();
	const toast = getToastState();

	// Seeded once, like `useState(initial)`. The page's loading gate guarantees
	// `app.user` is populated before this component mounts.
	let name = $state(app.user.name);
	let bio = $state(app.user.bio);
	let pic = $state(app.user.pic);

	// Track *which* URL failed to load rather than a bare "is broken" flag: that makes
	// the error a derivation of the current picture, so it clears by itself when the
	// picture changes — no reset bookkeeping.
	let brokenPic = $state<string | null>(null);
	let picError = $derived(brokenPic !== null && brokenPic === app.user.pic);

	async function handleSubmit() {
		try {
			await userService.updateUser(name, bio, pic);
			await app.refreshAuth(); // Refresh user data in context
			toast.success('Profile updated successfully');
		} catch (error) {
			console.error('Error updating profile:', error);
			toast.error('Failed to update profile');
		}
	}

	const fieldClass =
		'w-full rounded-lg border border-gray-200 bg-transparent p-3 text-gray-900 placeholder:text-gray-600 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:text-white dark:placeholder:text-gray-400';
	const labelClass = 'mb-2 block text-sm font-medium text-gray-900 dark:text-white';
</script>

<div class="space-y-8">
	<div class="text-center">
		<h1 class="mb-4 text-2xl font-light">Profile</h1>
		<p class="text-gray-600 dark:text-gray-400">Edit your profile information</p>
	</div>

	<Divider />

	<div class="space-y-6">
		<div>
			<label class={labelClass} for="profile-name">Name</label>
			<input
				id="profile-name"
				type="text"
				bind:value={name}
				class={fieldClass}
				placeholder="Your name"
			/>
		</div>

		<div>
			<label class={labelClass} for="profile-pic">Profile Picture</label>
			<input
				id="profile-pic"
				type="text"
				bind:value={pic}
				class={fieldClass}
				placeholder="Profile picture URL"
			/>

			{#if picError}
				<div
					class="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
				>
					<p class="text-sm text-red-600 dark:text-red-400">
						⚠️ Your profile picture is broken or the photo has been deleted
					</p>
				</div>
			{/if}

			<!-- Preview shows the *saved* picture, not the URL being typed. -->
			<div class="mt-3 flex items-center gap-4">
				<span class="text-sm text-gray-600 dark:text-gray-400">Current picture:</span>
				{#if app.user.pic && !picError}
					<img
						src={app.user.pic}
						alt="Profile preview"
						onerror={() => (brokenPic = app.user.pic)}
						class="h-16 w-16 rounded-full object-cover"
					/>
				{:else}
					<ProfileIcon class="h-16 w-16 text-gray-400 dark:text-gray-500" />
				{/if}
			</div>
		</div>

		<div>
			<label class={labelClass} for="profile-bio">Bio</label>
			<textarea
				id="profile-bio"
				bind:value={bio}
				rows={4}
				class={fieldClass}
				placeholder="Tell us about yourself"></textarea>
		</div>

		<Button onclick={handleSubmit} class="h-12 px-8">UPDATE PROFILE</Button>
	</div>
</div>
