<script lang="ts">
	import { guestsService } from '$lib/api/services';

	interface GuestAvatarProps {
		guestId?: string;
		/** Avatar file extension from the guest payload; "" or absent means no avatar. */
		avatar?: string;
		/** Alt text — the guest's name. */
		name?: string;
		/** Which server-side square variant to request. */
		size?: 48 | 192;
		/** Cache-bust token; appended as ?v= when > 0 (after the owner changes their own avatar). */
		version?: number;
		/** Sizing classes, e.g. "h-8 w-8". */
		class?: string;
	}

	let {
		guestId,
		avatar,
		name = '',
		size = 48,
		version = 0,
		class: cls = ''
	}: GuestAvatarProps = $props();

	// Only render an image when the guest actually has an avatar. There is deliberately no
	// placeholder: a guest without one (or whose image fails to load) renders nothing, so the
	// surrounding UI looks exactly as it did before avatars existed.
	let src = $derived.by(() => {
		if (!guestId || !avatar) return '';
		const url = guestsService.getAvatarUrl(guestId, size);
		return version ? `${url}?v=${version}` : url;
	});
	// Track which url failed so the error self-clears when the url changes (Profile.svelte idiom).
	let broken = $state<string | null>(null);
	let show = $derived(src !== '' && broken !== src);
</script>

{#if show}
	<img {src} alt={name} onerror={() => (broken = src)} class="rounded-full object-cover {cls}" />
{/if}
