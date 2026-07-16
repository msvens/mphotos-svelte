<script lang="ts">
	import { getToastState } from '$lib/stores/toast.svelte';
	import Toast from './Toast.svelte';

	const toast = getToastState();
</script>

<!--
	Sits above Dialog (z-50) so a toast fired while a dialog is open — e.g. Maintenance's
	delete-failed path — is not hidden behind the backdrop.
-->
<div class="pointer-events-none fixed top-20 right-6 z-60 flex flex-col gap-2">
	{#each toast.toasts as t (t.id)}
		<div class="pointer-events-auto">
			<Toast
				id={t.id}
				message={t.message}
				severity={t.severity}
				autoHideDuration={t.autoHideDuration}
				onClose={(id) => toast.remove(id)}
			/>
		</div>
	{/each}
</div>
