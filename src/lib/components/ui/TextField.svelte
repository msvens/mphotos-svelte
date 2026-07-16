<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface TextFieldProps extends Omit<HTMLInputAttributes, 'value'> {
		/** `number | undefined` for `type="number"`: Svelte coerces the binding for us. */
		value?: string | number;
		label?: string;
		fullWidth?: boolean;
		class?: string;
	}

	// `type`, `min`, `max`, `placeholder`, `disabled` … all arrive through `rest` and land
	// on the input, so they need no props of their own.
	let {
		value = $bindable(),
		label,
		fullWidth = false,
		class: cls = '',
		id,
		...rest
	}: TextFieldProps = $props();

	const uid = $props.id();
	let inputId = $derived(id ?? uid);
	let widthClass = $derived(fullWidth ? 'w-full' : '');
</script>

<div class={widthClass}>
	{#if label}
		<label for={inputId} class="mb-1 block text-xs text-gray-600 dark:text-gray-400">
			{label}
		</label>
	{/if}
	<input
		id={inputId}
		bind:value
		class="rounded border border-gray-300 bg-transparent px-3 py-2 text-gray-900 placeholder:text-gray-600 hover:border-gray-900 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400 dark:hover:border-white {widthClass} {cls}"
		{...rest}
	/>
</div>
