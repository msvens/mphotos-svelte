<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface CheckboxProps extends HTMLInputAttributes {
		checked?: boolean;
		label?: string;
	}

	let { checked = $bindable(false), label, id, ...rest }: CheckboxProps = $props();

	const uid = $props.id();
	let inputId = $derived(id ?? uid);
</script>

<label for={inputId} class="flex w-fit cursor-pointer items-center gap-2">
	<input
		id={inputId}
		type="checkbox"
		bind:checked
		class="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-500 accent-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600"
		{...rest}
	/>
	{#if label}
		<span class="text-sm text-gray-900 dark:text-white">{label}</span>
	{/if}
</label>
