<script module lang="ts">
	import type { GuestReaction } from '$lib/api/types';

	/** Exported for testing — the wording is fiddly and worth pinning down directly. */
	export function getLikesText(likesPhoto: boolean, guests: GuestReaction[]): string {
		if (guests.length === 0) {
			return 'Be the first to like this picture';
		}

		if (likesPhoto) {
			switch (guests.length) {
				case 1:
					return 'Liked by you';
				case 2:
					return `liked by you and ${guests.length - 1} other`;
				default:
					return `liked by you and ${guests.length - 1} others`;
			}
		} else {
			switch (guests.length) {
				case 1:
					return `Liked by ${guests[0].name}`;
				case 2:
					return `liked by ${guests[0].name} and ${guests.length - 1} other`;
				default:
					return `liked by ${guests[0].name} and ${guests.length - 1} others`;
			}
		}
	}
</script>

<script lang="ts">
	import { Icon, Heart } from 'svelte-hero-icons';
	import { guestsService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import RegisterGuestDialog from '$lib/components/guest/RegisterGuestDialog.svelte';

	interface PhotoLikesProps {
		photoId: string;
	}

	let { photoId }: PhotoLikesProps = $props();

	const app = getAppState();

	let likesPhoto = $state(false);
	let guests = $state<GuestReaction[]>([]);
	let showRegisterDialog = $state(false);
	let isLoading = $state(false);

	let likesText = $derived(getLikesText(likesPhoto, guests));

	/** Whether *this* visitor has liked the photo. */
	$effect(() => {
		if (!photoId) return;
		if (!app.isGuest) {
			likesPhoto = false;
			return;
		}
		let cancelled = false;
		guestsService
			.getGuestLike(photoId)
			.then((hasLiked) => {
				if (!cancelled) likesPhoto = hasLiked;
			})
			.catch((e) => {
				console.error('Error loading guest like:', e);
				if (!cancelled) likesPhoto = false;
			});
		return () => (cancelled = true);
	});

	// Everyone who liked it. Keyed on the photo alone — the React version also listed
	// `likesPhoto` as a dependency to refresh after a like, which made it run twice on
	// mount. `refreshLikes()` after a successful toggle does that job explicitly.
	$effect(() => {
		if (!photoId) return;
		let cancelled = false;
		guestsService
			.getPhotoLikes(photoId)
			.then((likes) => {
				if (!cancelled) guests = likes;
			})
			.catch((e) => {
				console.error('Error loading photo likes:', e);
				if (!cancelled) guests = [];
			});
		return () => (cancelled = true);
	});

	async function refreshLikes() {
		try {
			guests = await guestsService.getPhotoLikes(photoId);
		} catch (e) {
			console.error('Error loading photo likes:', e);
		}
	}

	async function handleLikeClick() {
		if (isLoading) return;
		// Liking requires a registered guest; anyone else gets the sign-up dialog.
		if (!app.isGuest) {
			showRegisterDialog = true;
			return;
		}

		isLoading = true;
		try {
			if (likesPhoto) {
				await guestsService.unlikePhoto(photoId);
				likesPhoto = false;
			} else {
				await guestsService.likePhoto(photoId);
				likesPhoto = true;
			}
			await refreshLikes();
		} catch (e) {
			console.error('Error toggling like:', e);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex items-center space-x-3">
	<button
		type="button"
		onclick={handleLikeClick}
		disabled={isLoading}
		class="cursor-pointer transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
		aria-label={likesPhoto ? 'Unlike photo' : 'Like photo'}
	>
		<Icon
			src={Heart}
			solid={likesPhoto}
			class={likesPhoto
				? 'h-6 w-6 text-[#b5043c]'
				: 'h-6 w-6 text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-200'}
		/>
	</button>
	<span class="text-sm text-gray-900 dark:text-white">{likesText}</span>
</div>

{#if showRegisterDialog}
	<!-- Registration finishes via the emailed link, so there's nothing to refresh here. -->
	<RegisterGuestDialog onClose={() => (showRegisterDialog = false)} />
{/if}
