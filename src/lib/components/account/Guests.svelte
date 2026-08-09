<script lang="ts">
	import { onMount } from 'svelte';
	import { Icon, CheckCircle, Clock } from 'svelte-hero-icons';
	import { guestsService } from '$lib/api/services';
	import type { Guest } from '$lib/api/types';
	import GuestAvatar from '$lib/components/guest/GuestAvatar.svelte';
	import Select, { type SelectOption } from '$lib/components/ui/Select.svelte';

	const FILTER_OPTIONS: SelectOption[] = [
		{ value: 'all', label: 'All guests' },
		{ value: 'verified', label: 'Verified' },
		{ value: 'pending', label: 'Pending' }
	];

	let guests = $state<Guest[]>([]);
	let loading = $state(true);
	let error = $state('');
	let filter = $state('all');

	let verifiedCount = $derived(guests.filter((g) => g.verified).length);
	let shown = $derived(
		filter === 'all' ? guests : guests.filter((g) => g.verified === (filter === 'verified'))
	);

	onMount(async () => {
		try {
			// Owner-only endpoint; the account shell already gates on `app.isUser`.
			guests = await guestsService.getGuests();
		} catch (e) {
			console.error('Error fetching guests:', e);
			error = e instanceof Error ? e.message : 'Failed to load guests';
		} finally {
			loading = false;
		}
	});

	const formatDate = (t: string) =>
		new Date(t).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

	// The backend stamps `verifyTime` at signup and overwrites it on verification, so the same
	// field reads as "signed up" for a pending guest and "verified" for a verified one.
	const dateLabel = (guest: Guest) =>
		`${guest.verified ? 'Verified' : 'Signed up'} ${formatDate(guest.verifyTime)}`;
</script>

<div class="space-y-4">
	<h1 class="mb-4 text-2xl font-light">Guests</h1>

	{#if loading}
		<div class="flex justify-center py-8">
			<div
				class="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900 dark:border-white"
			></div>
		</div>
	{:else if error}
		<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
	{:else if guests.length === 0}
		<p class="text-sm text-gray-600 dark:text-gray-400">No guests yet.</p>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-4">
			<p class="text-sm text-gray-600 dark:text-gray-400">
				{guests.length}
				{guests.length === 1 ? 'guest' : 'guests'} · {verifiedCount} verified{filter !== 'all'
					? ` · showing ${shown.length}`
					: ''}
			</p>
			<Select bind:value={filter} options={FILTER_OPTIONS} />
		</div>

		{#if shown.length === 0}
			<p class="text-sm text-gray-600 dark:text-gray-400">No matching guests.</p>
		{:else}
			<ul class="divide-y divide-gray-200 dark:divide-gray-700">
				{#each shown as guest (guest.guestId)}
					<li class="flex items-start gap-3 py-3">
						<!-- Fixed box: GuestAvatar renders nothing when the guest has no avatar. -->
						<div class="h-10 w-10 flex-shrink-0">
							<GuestAvatar
								guestId={guest.guestId}
								avatar={guest.avatar}
								name={guest.name}
								size={48}
								class="h-10 w-10"
							/>
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-x-2">
								<span class="text-sm font-medium text-gray-900 dark:text-white">{guest.name}</span>
								{#if guest.verified}
									<span
										class="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
									>
										<Icon src={CheckCircle} class="h-4 w-4" />Verified
									</span>
								{:else}
									<span
										class="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
									>
										<Icon src={Clock} class="h-4 w-4" />Pending
									</span>
								{/if}
							</div>
							{#if guest.fullName}
								<div class="text-sm text-gray-600 dark:text-gray-400">{guest.fullName}</div>
							{/if}
							<div class="text-sm break-all text-gray-600 dark:text-gray-400">{guest.email}</div>
							<div class="text-xs text-gray-500 dark:text-gray-500">{dateLabel(guest)}</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>
