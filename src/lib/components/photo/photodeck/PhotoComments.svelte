<script lang="ts">
	import { guestsService } from '$lib/api/services';
	import { ApiError } from '$lib/api/client';
	import { getAppState } from '$lib/stores/app.svelte';
	import type { PhotoComment } from '$lib/api/types';
	import GuestSignInDialog from '$lib/components/guest/GuestSignInDialog.svelte';
	import GuestAvatar from '$lib/components/guest/GuestAvatar.svelte';

	interface PhotoCommentsProps {
		photoId: string;
	}

	let { photoId }: PhotoCommentsProps = $props();

	const app = getAppState();

	let comments = $state<PhotoComment[]>([]);
	let newComment = $state('');
	let showSignIn = $state(false);
	let isPosting = $state(false);
	let isLoadingComments = $state(true);

	// Wait for auth to settle before fetching — otherwise this races the session cookie.
	$effect(() => {
		if (!photoId || app.loading) return;
		let cancelled = false;
		isLoadingComments = true;
		guestsService
			.getPhotoComments(photoId)
			.then((result) => {
				if (!cancelled) comments = result;
			})
			.catch((e) => {
				console.error('Error loading comments:', e);
				if (!cancelled) comments = [];
			})
			.finally(() => {
				if (!cancelled) isLoadingComments = false;
			});
		return () => (cancelled = true);
	});

	async function handlePostComment() {
		if (!newComment.trim() || isPosting) return;
		// Commenting requires a signed-in guest; anyone else gets the sign-in dialog.
		if (!app.isGuest) {
			showSignIn = true;
			return;
		}

		isPosting = true;
		try {
			const comment = await guestsService.commentPhoto(photoId, newComment);
			comments = [...comments, comment];
			newComment = '';
		} catch (e) {
			if (e instanceof ApiError && e.status === 401) {
				// The 30-day guest session lapsed — reflect that and prompt a fresh code login.
				await app.refreshGuest();
				showSignIn = true;
			} else {
				console.error('Error posting comment:', e);
			}
		} finally {
			isPosting = false;
		}
	}

	async function closeSignIn(signedIn?: boolean) {
		showSignIn = false;
		if (signedIn) await app.refreshGuest();
	}

	const formatDate = (timeString: string) =>
		new Date(timeString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
</script>

<div
	class="mt-6 flex items-center space-x-2 rounded border border-gray-300 p-1 dark:border-gray-600"
>
	<textarea
		class="flex-1 resize-none bg-transparent px-1 py-1 text-sm text-gray-900 placeholder-gray-500 outline-none dark:text-white dark:placeholder-gray-400"
		placeholder="Add comment..."
		aria-label="Add comment..."
		bind:value={newComment}
		rows={1}></textarea>
	<button
		type="button"
		onclick={handlePostComment}
		disabled={isPosting || !newComment.trim()}
		class="rounded px-3 py-1 text-sm text-gray-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white dark:hover:bg-gray-800"
	>
		Post
	</button>
</div>

<div class="mt-4 space-y-4">
	{#if isLoadingComments}
		<div class="text-sm text-gray-400">Loading comments...</div>
	{:else if comments.length === 0}
		<div class="text-sm text-gray-400">No comments yet. Be the first to comment!</div>
	{:else}
		{#snippet commentBody(comment: PhotoComment)}
			<!-- Author is the anchor (medium/primary); date + bio recede below it, each on its
			     own line so a long bio wraps instead of truncating. -->
			<div class="text-sm">
				<span class="font-medium text-gray-900 dark:text-white">{comment.name}</span><span
					class="text-gray-500 dark:text-gray-500">, {formatDate(comment.time)}</span
				>
			</div>
			{#if comment.description}
				<div class="text-xs text-gray-500 dark:text-gray-500">{comment.description}</div>
			{/if}
			<div class="mt-0.5 text-sm text-gray-800 dark:text-gray-200">{comment.body}</div>
		{/snippet}
		{#each comments as comment (comment.id)}
			<!-- Avatar only when the author set one: an avatar-less comment renders exactly as
			     before (no icon, no gap). -->
			{#if comment.guestId && comment.avatar}
				<div class="mr-2 flex items-start gap-2">
					<GuestAvatar
						guestId={comment.guestId}
						avatar={comment.avatar}
						name={comment.name}
						size={48}
						class="h-8 w-8 flex-shrink-0"
					/>
					<div class="min-w-0">{@render commentBody(comment)}</div>
				</div>
			{:else}
				<div class="mr-2">{@render commentBody(comment)}</div>
			{/if}
		{/each}
	{/if}
</div>

{#if showSignIn}
	<GuestSignInDialog onClose={closeSignIn} />
{/if}
