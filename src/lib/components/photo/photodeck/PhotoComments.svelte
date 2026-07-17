<script lang="ts">
	import { guestsService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import type { PhotoComment } from '$lib/api/types';
	import RegisterGuestDialog from '$lib/components/guest/RegisterGuestDialog.svelte';

	interface PhotoCommentsProps {
		photoId: string;
	}

	let { photoId }: PhotoCommentsProps = $props();

	const app = getAppState();

	let comments = $state<PhotoComment[]>([]);
	let newComment = $state('');
	let showRegisterDialog = $state(false);
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
		// Commenting requires a registered guest; anyone else gets the sign-up dialog.
		if (!app.isGuest) {
			showRegisterDialog = true;
			return;
		}

		isPosting = true;
		try {
			const comment = await guestsService.commentPhoto(photoId, newComment);
			comments = [...comments, comment];
			newComment = '';
		} catch (e) {
			console.error('Error posting comment:', e);
		} finally {
			isPosting = false;
		}
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
		{#each comments as comment (comment.id)}
			<div class="mr-2">
				<div class="text-sm text-gray-600 dark:text-gray-400">
					{comment.name}, {formatDate(comment.time)}
				</div>
				<div class="mt-1 text-sm text-gray-900 dark:text-white">{comment.body}</div>
			</div>
		{/each}
	{/if}
</div>

{#if showRegisterDialog}
	<!-- Registration finishes via the emailed link, so there's nothing to refresh here. -->
	<RegisterGuestDialog onClose={() => (showRegisterDialog = false)} />
{/if}
