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
	import { ApiError } from '$lib/api/client';
	import { getAppState } from '$lib/stores/app.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import GuestSignInDialog from '$lib/components/guest/GuestSignInDialog.svelte';

	interface PhotoLikesProps {
		photoId: string;
	}

	let { photoId }: PhotoLikesProps = $props();

	const app = getAppState();

	let likesPhoto = $state(false);
	let guests = $state<GuestReaction[]>([]);
	let showSignIn = $state(false);
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
		// Liking requires a signed-in guest; anyone else gets the sign-in dialog.
		if (!app.isGuest) {
			showSignIn = true;
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
			if (e instanceof ApiError && e.status === 401) {
				// The 30-day guest session lapsed — reflect that and prompt a fresh code login.
				await app.refreshGuest();
				showSignIn = true;
			} else {
				console.error('Error toggling like:', e);
			}
		} finally {
			isLoading = false;
		}
	}

	async function closeSignIn(signedIn?: boolean) {
		showSignIn = false;
		if (signedIn) {
			await app.refreshGuest();
			await refreshLikes();
		}
	}
</script>

<div class="flex items-center space-x-3">
	<Tooltip title={likesPhoto ? 'Unlike photo' : 'Like photo'} placement="top">
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
	</Tooltip>
	<span class="text-sm text-gray-900 dark:text-white">{likesText}</span>
</div>

{#if showSignIn}
	<GuestSignInDialog onClose={closeSignIn} />
{/if}
